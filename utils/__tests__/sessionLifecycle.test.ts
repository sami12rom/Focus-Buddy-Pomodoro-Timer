import type { ActiveSessionSnapshot } from '../../store/sessionStore';
import {
  buildRecoveredSessionRuntime,
  runSessionExitCleanup,
  type SessionExitKind,
} from '../sessionLifecycle';

const NOW = 2_000_000;

function snapshot(
  type: 'focus' | 'break',
  status: 'running' | 'paused',
): ActiveSessionSnapshot {
  return {
    type,
    status,
    startedAt: NOW - 60_000,
    durationMs: type === 'focus' ? 25 * 60_000 : 5 * 60_000,
    totalPausedMs: 10_000,
    pausedAt: status === 'paused' ? NOW - 20_000 : null,
    task: 'Review launch plan',
    tag: 'Work',
    createdAt: new Date(NOW - 60_000).toISOString(),
    isLongBreak: type === 'break',
  };
}

describe('recovered session runtime', () => {
  it.each([
    ['running focus', snapshot('focus', 'running'), true, 24 * 60_000 + 10_000],
    ['paused focus', snapshot('focus', 'paused'), false, 24 * 60_000 + 30_000],
    ['running break', snapshot('break', 'running'), true, 4 * 60_000 + 10_000],
    ['paused break', snapshot('break', 'paused'), false, 4 * 60_000 + 30_000],
  ] as const)(
    'builds notification and scheduling state for %s recovery',
    (_label, saved, shouldScheduleCompletion, remainingMs) => {
      const runtime = buildRecoveredSessionRuntime(saved, NOW);

      expect(runtime).toEqual({
        taskInput: saved.task,
        remainingMs,
        shouldScheduleCompletion,
        notification: {
          status: saved.status,
          startTime: saved.startedAt,
          activeDurationMs: saved.durationMs,
          totalPausedMs: saved.totalPausedMs,
          pausedAt: saved.pausedAt,
          task: saved.type === 'focus' ? saved.task : '',
          sessionType: saved.type,
        },
      });
    },
  );
});

describe('session exit cleanup', () => {
  it.each([
    ['focus-complete', true],
    ['focus-cancel', true],
    ['break-complete', false],
    ['break-skip', false],
  ] as const)('cleans up resources for %s', async (kind, shouldSyncFocusEnd) => {
    const cancelScheduledNotification = jest.fn().mockResolvedValue(undefined);
    const stopTimerNotification = jest.fn().mockResolvedValue(undefined);
    const syncSessionEnd = jest.fn().mockResolvedValue(undefined);

    await runSessionExitCleanup(kind as SessionExitKind, {
      cancelScheduledNotification,
      stopTimerNotification,
      syncSessionEnd,
    });

    expect(cancelScheduledNotification).toHaveBeenCalledTimes(1);
    expect(stopTimerNotification).toHaveBeenCalledTimes(1);
    expect(syncSessionEnd).toHaveBeenCalledTimes(shouldSyncFocusEnd ? 1 : 0);
  });

  it('attempts every cleanup operation even when one dependency rejects', async () => {
    const cancelScheduledNotification = jest.fn().mockRejectedValue(new Error('cancel failed'));
    const stopTimerNotification = jest.fn().mockResolvedValue(undefined);
    const syncSessionEnd = jest.fn().mockResolvedValue(undefined);

    await expect(
      runSessionExitCleanup('focus-cancel', {
        cancelScheduledNotification,
        stopTimerNotification,
        syncSessionEnd,
      }),
    ).resolves.toBeUndefined();

    expect(stopTimerNotification).toHaveBeenCalledTimes(1);
    expect(syncSessionEnd).toHaveBeenCalledTimes(1);
  });
});
