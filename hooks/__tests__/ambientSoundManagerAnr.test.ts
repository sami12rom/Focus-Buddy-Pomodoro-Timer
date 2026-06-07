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
});
