// Core audio management logic extracted from useAmbientSound, testable without React.

// Promise<unknown> keeps the interface compatible with Audio.Sound, whose methods
// return Promise<AVPlaybackStatus> rather than Promise<void>.
export interface SoundLike {
  setVolumeAsync(volume: number): Promise<unknown>;
  stopAsync(): Promise<unknown>;
  unloadAsync(): Promise<unknown>;
}

export class AmbientSoundManager<T extends SoundLike = SoundLike> {
  readonly soundRefs: Record<string, T> = {};
  private readonly fadeTimerRefs: Record<string, ReturnType<typeof setTimeout> | null> = {};
  // Stores the resolve() of any in-flight rampTo so stopFade can unblock it.
  private readonly fadeResolversRef: Record<string, (() => void) | null> = {};

  private readonly volumeGetter: () => number;
  private readonly layerCountGetter: () => number;

  constructor(volumeGetter: () => number, layerCountGetter: () => number) {
    this.volumeGetter = volumeGetter;
    this.layerCountGetter = layerCountGetter;
  }

  targetVolume(ratio: number): number {
    const mixGain = 1 / Math.sqrt(this.layerCountGetter());
    return Math.max(0, Math.min(1, ratio * this.volumeGetter() * mixGain));
  }

  // Clears the pending fade step and resolves any pending rampTo promise.
  // This ensures `await rampTo(...)` never hangs when interrupted externally.
  stopFade(id: string): void {
    if (this.fadeTimerRefs[id]) {
      clearTimeout(this.fadeTimerRefs[id]!);
      this.fadeTimerRefs[id] = null;
    }
    if (this.fadeResolversRef[id]) {
      this.fadeResolversRef[id]!();
      this.fadeResolversRef[id] = null;
    }
  }

  rampTo(id: string, sound: T, toRatio: number, durationMs: number): Promise<void> {
    this.stopFade(id); // resolves any prior rampTo for this id
    const fromRatio = toRatio > 0 ? 0 : 1;
    // Wall-clock start time: if the app was suspended while a fade was running,
    // the first callback after resume sees elapsed >> durationMs, snaps to the
    // target volume in one call, and exits — no backlog of bridge calls.
    const startTime = Date.now();
    return new Promise((resolve) => {
      this.fadeResolversRef[id] = resolve; // stored so stopFade can call it
      const step = async () => {
        this.fadeTimerRefs[id] = null;
        const progress = Math.min((Date.now() - startTime) / durationMs, 1);
        const ratio = fromRatio + (toRatio - fromRatio) * progress;
        try {
          await sound.setVolumeAsync(this.targetVolume(ratio));
        } catch (_e) {
          // Sound was already unloaded — stop cleanly.
          this.stopFade(id);
          return;
        }

        // The fade may have been cancelled or replaced while the native write
        // was in flight. Do not schedule another write for a stale fade.
        if (this.fadeResolversRef[id] !== resolve) return;

        if (progress >= 1) {
          this.stopFade(id);
        } else {
          this.fadeTimerRefs[id] = setTimeout(step, 50);
        }
      };
      this.fadeTimerRefs[id] = setTimeout(step, 50);
    });
  }

  // Fade out (optional), then stop and unload the given sound object.
  // The caller must remove the id from soundRefs BEFORE calling this so that
  // any concurrent run doesn't see the id as "already loaded" and skip reloading.
  async drainSound(id: string, sound: T, fadeOut: boolean): Promise<void> {
    this.stopFade(id);
    try {
      if (fadeOut) {
        await this.rampTo(id, sound, 0, 800);
      } else {
        await sound.setVolumeAsync(0).catch(() => {});
      }
      await sound.stopAsync();
      await sound.unloadAsync();
    } catch (_e) {}
  }

  // Unload the sound registered under `id`.
  // Removes it from soundRefs IMMEDIATELY before any async work so concurrent
  // calls short-circuit and a concurrent reload can proceed without waiting.
  async unloadSound(id: string, fadeOut = false): Promise<void> {
    const sound = this.soundRefs[id];
    if (!sound) return;
    delete this.soundRefs[id]; // claim immediately — prevents double-unload
    await this.drainSound(id, sound, fadeOut);
  }

  stopAllFades(): void {
    Object.keys(this.fadeTimerRefs).forEach((id) => this.stopFade(id));
  }

  dispose(): void {
    this.stopAllFades();
    Object.values(this.soundRefs).forEach((s) => s.unloadAsync().catch(() => {}));
    for (const id of Object.keys(this.soundRefs)) delete this.soundRefs[id];
  }
}
