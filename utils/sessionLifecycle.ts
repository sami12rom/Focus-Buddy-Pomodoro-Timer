import type { ActiveSessionSnapshot } from '../store/sessionStore';
import type { TimerNotifParams } from './timerNotification';

export type SessionExitKind =
  | 'focus-complete'
  | 'focus-cancel'
  | 'break-complete'
  | 'break-skip';

interface SessionExitDependencies {
  cancelScheduledNotification: () => Promise<void> | void;
  stopTimerNotification: () => Promise<void> | void;
  syncSessionEnd: () => Promise<void> | void;
}

interface RecoveredSessionRuntime {
  taskInput: string;
  remainingMs: number;
  shouldScheduleCompletion: boolean;
  notification: TimerNotifParams;
}

export function buildRecoveredSessionRuntime(
  snapshot: ActiveSessionSnapshot,
  now = Date.now(),
): RecoveredSessionRuntime {
  const endOfElapsedTime =
    snapshot.status === 'paused' && snapshot.pausedAt !== null
      ? snapshot.pausedAt
      : now;
  const elapsedMs = Math.max(
    0,
    endOfElapsedTime - snapshot.startedAt - snapshot.totalPausedMs,
  );
  const remainingMs = Math.max(0, snapshot.durationMs - elapsedMs);

  return {
    taskInput: snapshot.task,
    remainingMs,
    shouldScheduleCompletion: snapshot.status === 'running' && remainingMs > 0,
    notification: {
      status: snapshot.status,
      startTime: snapshot.startedAt,
      activeDurationMs: snapshot.durationMs,
      totalPausedMs: snapshot.totalPausedMs,
      pausedAt: snapshot.pausedAt,
      task: snapshot.type === 'focus' ? snapshot.task : '',
      sessionType: snapshot.type,
    },
  };
}

export async function runSessionExitCleanup(
  kind: SessionExitKind,
  dependencies: SessionExitDependencies,
): Promise<void> {
  const operations: Array<Promise<void>> = [
    Promise.resolve().then(() => dependencies.cancelScheduledNotification()),
    Promise.resolve().then(() => dependencies.stopTimerNotification()),
  ];

  if (kind === 'focus-complete' || kind === 'focus-cancel') {
    operations.push(Promise.resolve().then(() => dependencies.syncSessionEnd()));
  }

  await Promise.allSettled(operations);
}
