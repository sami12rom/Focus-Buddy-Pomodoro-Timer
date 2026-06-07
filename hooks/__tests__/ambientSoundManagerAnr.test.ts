import { AmbientSoundManager, SoundLike } from '../ambientSoundManager';

describe('AmbientSoundManager ANR protection', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('never overlaps native volume writes during a fade', async () => {
    let isFirstWrite = true;
    let resolveFirstWrite = () => {};
    let writeInFlight = false;
    let maxConcurrentWrites = 0;
    let concurrentWrites = 0;

    const sound: SoundLike = {
      setVolumeAsync: jest.fn().mockImplementation(() => {
        concurrentWrites += 1;
        writeInFlight = true;
        maxConcurrentWrites = Math.max(maxConcurrentWrites, concurrentWrites);

        if (isFirstWrite) {
          isFirstWrite = false;
          return new Promise<void>((resolve) => {
            resolveFirstWrite = () => {
              concurrentWrites -= 1;
              writeInFlight = false;
              resolve();
            };
          });
        }

        concurrentWrites -= 1;
        return Promise.resolve();
      }),
      stopAsync: jest.fn().mockResolvedValue(undefined),
      unloadAsync: jest.fn().mockResolvedValue(undefined),
    };
    const manager = new AmbientSoundManager(() => 1, () => 1);
    const fade = manager.rampTo('rain', sound, 1, 1_000);

    jest.advanceTimersByTime(250);

    expect(writeInFlight).toBe(true);
    expect(maxConcurrentWrites).toBe(1);
    expect(sound.setVolumeAsync).toHaveBeenCalledTimes(1);

    resolveFirstWrite();
    manager.stopFade('rain');
    await fade;
    manager.dispose();
  });

  it('drainSound waits for an in-flight setVolumeAsync before calling unload when stopFade interrupts', async () => {
    // Regression: stopFade() resolves the rampTo promise immediately but cannot
    // cancel a native bridge call already in-flight. drainSound() must not call
    // unloadAsync until that setVolumeAsync has settled — otherwise Android may
    // crash or behave unexpectedly operating on an already-unloaded sound.
    //
    // The race has three microtask steps before drainSound reaches unloadAsync:
    //   1. setVolumeAsync(0).catch() chain resolves
    //   2. stopAsync() resolves
    //   3. unloadAsync() is called  ← must NOT happen while vol-write is in-flight
    //
    // Five flushes (generous headroom) guarantee drain has had every opportunity
    // to call unloadAsync if it is NOT waiting for the in-flight write.
    let resolveVolumeWrite!: () => void;

    const sound: SoundLike = {
      setVolumeAsync: jest.fn()
        .mockImplementationOnce(() => {
          // First call (fade step) blocks until the test resolves it
          return new Promise<void>((resolve) => {
            resolveVolumeWrite = resolve;
          });
        })
        .mockResolvedValue(undefined),
      stopAsync: jest.fn().mockResolvedValue(undefined),
      unloadAsync: jest.fn().mockResolvedValue(undefined),
    };

    const manager = new AmbientSoundManager(() => 1, () => 1);

    // Start a fade — first step fires at 50 ms
    const fade = manager.rampTo('rain', sound, 1, 1_000);
    jest.advanceTimersByTime(50); // fires step timer; step calls setVolumeAsync synchronously

    expect(sound.setVolumeAsync).toHaveBeenCalledTimes(1);

    // Interrupt: stopFade resolves the outer rampTo promise early while the
    // native setVolumeAsync call is still in-flight
    manager.stopFade('rain');
    await fade;

    // Start drain — without the fix this proceeds immediately through
    // setVolumeAsync(0) / stopAsync / unloadAsync without waiting
    const drain = manager.drainSound('rain', sound, false);

    // Flush five microtask ticks — enough for drain to reach and call
    // unloadAsync if it is NOT serialized behind the in-flight write
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
    }

    // Drain must be blocked — unloadAsync must not have been called yet
    expect(sound.unloadAsync).not.toHaveBeenCalled();

    // Let the in-flight volume write settle, then let drain complete
    resolveVolumeWrite();
    await drain;

    expect(sound.unloadAsync).toHaveBeenCalledTimes(1);

    manager.dispose();
  });
});
