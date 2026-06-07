import { SoundUpdateScheduler } from '../soundUpdateScheduler';

describe('SoundUpdateScheduler — debounce + stale-runId detection', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ─── Core debounce: rapid taps must not trigger multiple native calls ─────────

  it('5 rapid schedule() calls result in exactly 1 onUpdate invocation', async () => {
    const onUpdate = jest.fn().mockResolvedValue(undefined);
    const scheduler = new SoundUpdateScheduler(200, onUpdate);

    // Simulate 5 rapid taps within 50 ms — well within the 200 ms debounce window.
    scheduler.schedule();
    await jest.advanceTimersByTimeAsync(10);
    scheduler.schedule();
    await jest.advanceTimersByTimeAsync(10);
    scheduler.schedule();
    await jest.advanceTimersByTimeAsync(10);
    scheduler.schedule();
    await jest.advanceTimersByTimeAsync(10);
    scheduler.schedule();

    // The debounce window hasn't fired yet — no calls yet.
    expect(onUpdate).not.toHaveBeenCalled();

    // Advance past the debounce window; the last scheduled call fires.
    await jest.advanceTimersByTimeAsync(200);

    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it('2 schedule() calls 300 ms apart result in 2 onUpdate invocations', async () => {
    const onUpdate = jest.fn().mockResolvedValue(undefined);
    const scheduler = new SoundUpdateScheduler(200, onUpdate);

    scheduler.schedule();
    await jest.advanceTimersByTimeAsync(300); // first fires at 200 ms
    scheduler.schedule();
    await jest.advanceTimersByTimeAsync(300); // second fires at 200 ms after this

    expect(onUpdate).toHaveBeenCalledTimes(2);
  });

  // ─── runId / stale detection ──────────────────────────────────────────────────

  it('isCurrent() returns true for the winning run', async () => {
    let capturedIsCurrent: (() => boolean) | null = null;
    const onUpdate = jest.fn().mockImplementation(async (_runId: number, isCurrent: () => boolean) => {
      capturedIsCurrent = isCurrent;
    });
    const scheduler = new SoundUpdateScheduler(200, onUpdate);

    scheduler.schedule();
    await jest.advanceTimersByTimeAsync(200);

    expect(capturedIsCurrent).not.toBeNull();
    expect(capturedIsCurrent!()).toBe(true);
  });

  it('isCurrent() returns false for a stale run when a newer schedule() has been called', async () => {
    const isCurrentResults: boolean[] = [];
    const onUpdate = jest.fn().mockImplementation(async (_runId: number, isCurrent: () => boolean) => {
      // Simulate some async work — check staleness after the debounce of the second call.
      isCurrentResults.push(isCurrent());
    });
    const scheduler = new SoundUpdateScheduler(200, onUpdate);

    // First call fires after 200 ms.
    scheduler.schedule();
    await jest.advanceTimersByTimeAsync(200);

    // Second call comes in immediately after the first onUpdate is invoked —
    // the first onUpdate's isCurrent() should now be false.
    scheduler.schedule();

    expect(onUpdate).toHaveBeenCalledTimes(1);
    // The first run was current when checked inside onUpdate (before schedule() was called again).
    // Now check staleness from outside:
    // get the isCurrent from the first invocation
    const [_runId1, isCurrent1] = onUpdate.mock.calls[0] as [number, () => boolean];
    expect(isCurrent1()).toBe(false); // a newer run was scheduled

    await jest.advanceTimersByTimeAsync(200);
    expect(onUpdate).toHaveBeenCalledTimes(2);
  });

  it('runId increments on every schedule() call, not only when the timer fires', async () => {
    const onUpdate = jest.fn().mockResolvedValue(undefined);
    const scheduler = new SoundUpdateScheduler(200, onUpdate);

    const id0 = scheduler.currentRunId;
    scheduler.schedule();
    const id1 = scheduler.currentRunId;
    scheduler.schedule();
    const id2 = scheduler.currentRunId;
    scheduler.schedule();
    const id3 = scheduler.currentRunId;

    expect(id1).toBe(id0 + 1);
    expect(id2).toBe(id0 + 2);
    expect(id3).toBe(id0 + 3);

    // Only one onUpdate fires despite 3 schedule() calls.
    await jest.advanceTimersByTimeAsync(200);
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  // ─── cancel() ─────────────────────────────────────────────────────────────────

  it('cancel() prevents the pending onUpdate from firing', async () => {
    const onUpdate = jest.fn().mockResolvedValue(undefined);
    const scheduler = new SoundUpdateScheduler(200, onUpdate);

    scheduler.schedule();
    scheduler.cancel();

    await jest.advanceTimersByTimeAsync(500);
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('cancel() marks an in-flight update as stale', async () => {
    let capturedIsCurrent: (() => boolean) | null = null;
    const onUpdate = jest.fn().mockImplementation(
      async (_runId: number, isCurrent: () => boolean) => {
        capturedIsCurrent = isCurrent;
      },
    );
    const scheduler = new SoundUpdateScheduler(200, onUpdate);

    scheduler.schedule();
    await jest.advanceTimersByTimeAsync(200);
    expect(capturedIsCurrent!()).toBe(true);

    scheduler.cancel();

    expect(capturedIsCurrent!()).toBe(false);
  });

  it('cancel() is a no-op when nothing is pending', () => {
    const onUpdate = jest.fn().mockResolvedValue(undefined);
    const scheduler = new SoundUpdateScheduler(200, onUpdate);

    // Should not throw.
    expect(() => scheduler.cancel()).not.toThrow();
    expect(() => scheduler.cancel()).not.toThrow();
  });

  // ─── Verify the ANR scenario: 5 taps in 2 seconds ─────────────────────────────
  // Without debounce, each tap immediately calls Audio.Sound.createAsync.
  // This test documents that the scheduler limits native calls to 1 per
  // debounce window, no matter how many rapid taps arrive.

  it('simulates rapid sound selector taps: only 1 native call per burst', async () => {
    let nativeCallCount = 0;
    const onUpdate = jest.fn().mockImplementation(async () => {
      nativeCallCount++; // represents Audio.Sound.createAsync
    });
    const scheduler = new SoundUpdateScheduler(200, onUpdate);

    // 5 taps within 150 ms — as fast as a user can tap the sound selector.
    for (let i = 0; i < 5; i++) {
      scheduler.schedule();
      await jest.advanceTimersByTimeAsync(30);
    }

    // Still within debounce window — no native call yet.
    expect(nativeCallCount).toBe(0);

    // Wait for debounce to settle.
    await jest.advanceTimersByTimeAsync(200);
    expect(nativeCallCount).toBe(1);
  });
});
