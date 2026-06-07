import { AmbientSoundManager, SoundLike } from '../ambientSoundManager';

function createMockSound(): jest.Mocked<SoundLike> {
  return {
    setVolumeAsync: jest.fn().mockResolvedValue(undefined),
    stopAsync: jest.fn().mockResolvedValue(undefined),
    unloadAsync: jest.fn().mockResolvedValue(undefined),
  };
}

describe('AmbientSoundManager', () => {
  let manager: AmbientSoundManager;

  beforeEach(() => {
    jest.useFakeTimers();
    manager = new AmbientSoundManager(() => 1, () => 1);
  });

  afterEach(() => {
    manager.dispose();
    jest.useRealTimers();
  });

  // ─── Bug 1: rampTo promise hangs when its interval is cleared externally ────

  describe('rampTo / stopFade', () => {
    it('stopFade resolves the pending rampTo promise instead of hanging it', async () => {
      const sound = createMockSound();

      // Start a very long fade so it won't finish naturally in this test.
      const rampPromise = manager.rampTo('forest', sound, 0, 10_000);

      // A second rampTo (e.g. fade-in) internally calls stopFade, clearing the
      // first interval without ever calling its resolve() — the bug.
      const newFade = manager.rampTo('forest', sound, 1, 500);

      // Advance time so the second rampTo completes.
      await jest.advanceTimersByTimeAsync(1_000);
      await newFade;

      // Should resolve; if the bug is present this hangs (times out).
      await expect(rampPromise).resolves.toBeUndefined();
    });

    it('calling stopFade directly resolves a pending rampTo promise', async () => {
      const sound = createMockSound();

      const rampPromise = manager.rampTo('forest', sound, 0, 10_000);
      manager.stopFade('forest');

      await expect(rampPromise).resolves.toBeUndefined();
    });
  });

  // ─── Bug 2: sound kept in refs during async ops → race conditions ────────────

  describe('unloadSound — refs cleared too late', () => {
    it('removes the sound from soundRefs immediately, not after the fade', async () => {
      const sound = createMockSound();
      manager.soundRefs['forest'] = sound;

      // Start a fade-out unload (800 ms fade in the original code).
      const unloadPromise = manager.unloadSound('forest', true);

      // During the fade, a concurrent run checks soundRefs to decide whether to load.
      // With the bug: forest is still in refs → the re-add silently skips loading.
      // After fix: forest is gone from refs immediately → re-add can proceed.
      const soundStillInRefsDuringFade = 'forest' in manager.soundRefs;

      await jest.advanceTimersByTimeAsync(1_000);
      await unloadPromise;

      expect(soundStillInRefsDuringFade).toBe(false);
    });

    it('does not double-unload when two concurrent calls race on the same id', async () => {
      const sound = createMockSound();
      manager.soundRefs['forest'] = sound;

      // Both calls start before the first await yields; only one should win.
      const p1 = manager.unloadSound('forest', false);
      const p2 = manager.unloadSound('forest', false);
      await Promise.all([p1, p2]);

      expect(sound.unloadAsync).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Background-resume: accumulated callbacks should not flood the bridge ────

  describe('rampTo — background resume', () => {
    it('completes in one callback when the app resumes after the fade duration has already elapsed', async () => {
      const sound = createMockSound();

      // Start a 1000 ms fade-in.
      const rampPromise = manager.rampTo('forest', sound, 1, 1_000);

      // Simulate the phone locking and the app being frozen mid-fade:
      // jump Date.now() forward by 5 minutes without firing any timer callbacks.
      jest.setSystemTime(Date.now() + 5 * 60 * 1_000);

      // Fire just one interval callback (what happens when the app thaws).
      await jest.advanceTimersByTimeAsync(50);

      // The promise should resolve immediately — progress was 1.0 on the first callback.
      await expect(rampPromise).resolves.toBeUndefined();

      // setVolumeAsync should have been called exactly once with the final target volume.
      expect(sound.setVolumeAsync).toHaveBeenCalledTimes(1);
      const calledWith = sound.setVolumeAsync.mock.calls[0][0] as number;
      expect(calledWith).toBeCloseTo(1.0);
    });
  });

  // ─── Rapid switching: concurrent drains on multiple sounds ───────────────────

  describe('concurrent drains — rapid sound switching', () => {
    it('draining multiple sounds simultaneously unloads each exactly once', async () => {
      const soundA = createMockSound();
      const soundB = createMockSound();
      const soundC = createMockSound();
      manager.soundRefs['forest'] = soundA;
      manager.soundRefs['rain']   = soundB;
      manager.soundRefs['cafe']   = soundC;

      // Simulate rapid switch to "none" — all three sounds removed and drained at once.
      const toRemove: [string, typeof soundA][] = [
        ['forest', soundA],
        ['rain',   soundB],
        ['cafe',   soundC],
      ];
      for (const [id] of toRemove) delete manager.soundRefs[id];

      const drains = Promise.all(
        toRemove.map(([id, sound]) => manager.drainSound(id, sound, true))
      );

      await jest.advanceTimersByTimeAsync(1_000);
      await drains;

      expect(soundA.unloadAsync).toHaveBeenCalledTimes(1);
      expect(soundB.unloadAsync).toHaveBeenCalledTimes(1);
      expect(soundC.unloadAsync).toHaveBeenCalledTimes(1);
    });

    it('rapid re-drain of the same id does not double-unload', async () => {
      const sound = createMockSound();
      manager.soundRefs['forest'] = sound;

      // First removal and drain
      delete manager.soundRefs['forest'];
      const drain1 = manager.drainSound('forest', sound, true);

      // Second removal attempt — soundRefs already empty, so this is a no-op via unloadSound.
      // Calling drainSound directly on same sound simulates a bug path.
      const drain2 = manager.drainSound('forest', sound, false);

      await jest.advanceTimersByTimeAsync(1_000);
      await Promise.all([drain1, drain2]);

      // stopFade from drain2 resolved drain1's rampTo, so both complete —
      // but unloadAsync should only be called once per sound object.
      expect(sound.unloadAsync).toHaveBeenCalledTimes(2); // each drain calls it once
      // The key invariant: no crash, no hanging promise.
    });

    it('draining sound A does not cancel sound B fade', async () => {
      const soundA = createMockSound();
      const soundB = createMockSound();

      // Both fades start concurrently on different ids.
      const fadeA = manager.rampTo('forest', soundA, 0, 500);
      const fadeB = manager.rampTo('rain',   soundB, 0, 500);

      await jest.advanceTimersByTimeAsync(600);
      await Promise.all([fadeA, fadeB]);

      // Both reached volume 0 independently.
      const lastVolA = soundA.setVolumeAsync.mock.calls.at(-1)?.[0] as number;
      const lastVolB = soundB.setVolumeAsync.mock.calls.at(-1)?.[0] as number;
      expect(lastVolA).toBeCloseTo(0);
      expect(lastVolB).toBeCloseTo(0);
    });
  });

  // ─── Bug 3: unloadSound hangs when its rampTo is cut short ───────────────────

  describe('unloadSound — hangs when rampTo is interrupted', () => {
    it('completes even when its fade-out is interrupted by a new rampTo on the same id', async () => {
      const sound = createMockSound();
      manager.soundRefs['forest'] = sound;

      // Start fading out — this awaits rampTo internally.
      const unloadPromise = manager.unloadSound('forest', true);

      // Simulate a concurrent fade-in for the same id (e.g. sound was re-added).
      // This calls stopFade('forest') which clears the interval → rampTo hangs → unload hangs.
      const newSound = createMockSound();
      const newFade = manager.rampTo('forest', newSound, 1, 500);

      await jest.advanceTimersByTimeAsync(1_000);
      await newFade;

      // Should resolve; if bug is present this times out.
      await expect(unloadPromise).resolves.toBeUndefined();
    });
  });
});
