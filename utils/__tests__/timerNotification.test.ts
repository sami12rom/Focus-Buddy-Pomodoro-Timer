jest.mock('react-native', () => {
  return {
    Platform: { OS: 'android' },
  };
});

jest.mock('@notifee/react-native', () => {
  const api = {
    createChannel: jest.fn().mockResolvedValue('focus_timer'),
    displayNotification: jest.fn().mockResolvedValue(undefined),
    getDisplayedNotifications: jest.fn().mockResolvedValue([]),
    cancelNotification: jest.fn().mockResolvedValue(undefined),
    registerForegroundService: jest.fn(),
    stopForegroundService: jest.fn().mockResolvedValue(undefined),
  };
  return {
    __esModule: true,
    default: api,
    AndroidImportance: { LOW: 2 },
    AndroidCategory: { PROGRESS: 'progress' },
  };
});

import notifee from '@notifee/react-native';
import {
  registerTimerForegroundService,
  startTimerNotification,
  stopTimerNotification,
  updateTimerNotification,
  type TimerNotifParams,
} from '../timerNotification';

const mockNotifee = notifee as jest.Mocked<typeof notifee>;
const NOW = 1_000_000;

function runningParams(overrides: Partial<TimerNotifParams> = {}): TimerNotifParams {
  return {
    status: 'running',
    startTime: NOW - 5_000,
    activeDurationMs: 25_000,
    totalPausedMs: 0,
    pausedAt: null,
    task: 'Write tests',
    sessionType: 'focus',
    ...overrides,
  };
}

async function flushMicrotasks() {
  for (let index = 0; index < 20; index += 1) {
    await Promise.resolve();
  }
}

describe('timerNotification foreground service', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    jest.clearAllMocks();
    mockNotifee.displayNotification.mockResolvedValue('focus_timer_live');
    mockNotifee.stopForegroundService.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not create a recurring JavaScript polling timer', () => {
    registerTimerForegroundService();
    const task = mockNotifee.registerForegroundService.mock.calls[0][0] as () => Promise<void>;

    void task();

    expect(jest.getTimerCount()).toBe(0);
  });

  it('uses Android native countdown rendering for a running session', async () => {
    await startTimerNotification(runningParams());

    const notification = mockNotifee.displayNotification.mock.calls[0][0];
    const android = notification.android!;
    expect(android.asForegroundService).toBe(true);
    expect(android.ongoing).toBe(true);
    expect(android.onlyAlertOnce).toBe(true);
    expect(android.showChronometer).toBe(true);
    expect(android.chronometerDirection).toBe('down');
    expect(android.timestamp).toBe(NOW + 20_000);
    expect(android.progress).toBeUndefined();
  });

  it('shows a static remaining time while paused', async () => {
    await updateTimerNotification(
      runningParams({
        status: 'paused',
        pausedAt: NOW - 2_000,
      })
    );

    const notification = mockNotifee.displayNotification.mock.calls[0][0];
    const android = notification.android!;
    expect(notification.body).toBe('Paused · 0:22 left');
    expect(android.showChronometer).toBe(false);
    expect(android.timestamp).toBeUndefined();
  });

  it('preserves timer state as string-only notification data', async () => {
    await startTimerNotification(
      runningParams({
        totalPausedMs: 4_000,
      })
    );

    const notification = mockNotifee.displayNotification.mock.calls[0][0];
    expect(notification.data).toEqual({
      active: '1',
      status: 'running',
      startTime: String(NOW - 5_000),
      activeDurationMs: '25000',
      totalPausedMs: '4000',
      pausedAt: '0',
      task: 'Write tests',
      sessionType: 'focus',
    });
  });

  it('uses break-specific notification copy', async () => {
    await startTimerNotification(
      runningParams({
        task: '',
        sessionType: 'break',
      })
    );

    const notification = mockNotifee.displayNotification.mock.calls[0][0];
    expect(notification.title).toBe('☕ Break Time');
    expect(notification.body).toBe('Break in progress');
  });

  it('updates only on explicit start, pause, or resume calls', async () => {
    await startTimerNotification(runningParams());
    await updateTimerNotification(
      runningParams({
        status: 'paused',
        pausedAt: NOW,
      })
    );
    await updateTimerNotification(
      runningParams({
        startTime: NOW - 10_000,
        totalPausedMs: 5_000,
      })
    );

    jest.advanceTimersByTime(10 * 60_000);

    expect(mockNotifee.displayNotification).toHaveBeenCalledTimes(3);
  });

  it('serializes start, pause, resume, extend, and stop so stop is the final operation', async () => {
    let releaseStart = () => {};
    mockNotifee.displayNotification.mockImplementationOnce(
      () =>
        new Promise<string>((resolve) => {
          releaseStart = () => resolve('focus_timer_live');
        }),
    );

    const start = startTimerNotification(runningParams());
    await flushMicrotasks();
    expect(mockNotifee.displayNotification).toHaveBeenCalledTimes(1);

    const pause = updateTimerNotification(
      runningParams({
        status: 'paused',
        pausedAt: NOW,
      }),
    );
    const resume = updateTimerNotification(runningParams());
    const extend = updateTimerNotification(
      runningParams({
        activeDurationMs: 35_000,
      }),
    );
    const stop = stopTimerNotification();

    await flushMicrotasks();
    expect(mockNotifee.displayNotification).toHaveBeenCalledTimes(1);
    expect(mockNotifee.stopForegroundService).not.toHaveBeenCalled();

    releaseStart();
    await Promise.all([start, pause, resume, extend, stop]);

    expect(
      mockNotifee.displayNotification.mock.calls.map(
        ([notification]) => notification.data?.status,
      ),
    ).toEqual(['running', 'paused', 'running', 'running']);
    expect(
      mockNotifee.displayNotification.mock.calls[3][0].android?.timestamp,
    ).toBe(NOW + 30_000);
    expect(mockNotifee.stopForegroundService).toHaveBeenCalledTimes(1);
    expect(mockNotifee.stopForegroundService.mock.invocationCallOrder[0]).toBeGreaterThan(
      mockNotifee.displayNotification.mock.invocationCallOrder[3],
    );
  });

  it('stops the foreground service explicitly', async () => {
    await stopTimerNotification();

    expect(mockNotifee.stopForegroundService).toHaveBeenCalledTimes(1);
  });

  it('resolves the foreground service task when the timer notification stops', async () => {
    registerTimerForegroundService();
    const task = mockNotifee.registerForegroundService.mock.calls[0][0] as () => Promise<void>;
    const serviceTask = task();
    let resolved = false;
    void serviceTask.then(() => {
      resolved = true;
    });

    await stopTimerNotification();
    await Promise.resolve();

    expect(resolved).toBe(true);
  });

  it('falls back to cancelling the notification if service shutdown fails', async () => {
    mockNotifee.stopForegroundService.mockRejectedValueOnce(new Error('native shutdown failed'));

    await stopTimerNotification();

    expect(mockNotifee.cancelNotification).toHaveBeenCalledWith('focus_timer_live');
  });
});
