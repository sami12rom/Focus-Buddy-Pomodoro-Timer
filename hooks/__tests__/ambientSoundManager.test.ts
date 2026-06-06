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
