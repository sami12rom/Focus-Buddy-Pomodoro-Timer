import { Platform } from 'react-native';

// notifee requires a native dev build — gracefully unavailable in Expo Go
let notifee: any = null;
let AndroidImportance: any = { LOW: 2 };
let AndroidCategory: any = { PROGRESS: 'progress' };
try {
  const mod = require('@notifee/react-native');
  notifee = mod.default;
  AndroidImportance = mod.AndroidImportance;
  AndroidCategory = mod.AndroidCategory;
} catch {
  // Expo Go — timer notification will be a no-op
}

const CHANNEL_ID = 'focus_timer';
const NOTIF_ID = 'focus_timer_live';
let resolveForegroundService: (() => void) | null = null;

export type TimerNotifParams = {
  status: 'running' | 'paused';
  startTime: number;
  activeDurationMs: number;
  totalPausedMs: number;
  pausedAt: number | null;
  task: string;
  sessionType: 'focus' | 'break';
};

// Notification data is stored as strings (notifee requirement)
type NotifData = Record<string, string>;

function toData(params: TimerNotifParams): NotifData {
  return {
    active: '1',
    status: params.status,
    startTime: String(params.startTime),
    activeDurationMs: String(params.activeDurationMs),
    totalPausedMs: String(params.totalPausedMs),
    pausedAt: String(params.pausedAt ?? 0),
    task: params.task,
    sessionType: params.sessionType,
  };
}

function getRemainingMs(p: TimerNotifParams): number {
  if (p.status === 'paused' && p.pausedAt) {
    return Math.max(0, p.activeDurationMs - (p.pausedAt - p.startTime - p.totalPausedMs));
  }
  return Math.max(0, p.activeDurationMs - (Date.now() - p.startTime - p.totalPausedMs));
}

function formatMs(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

async function setupChannel() {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Focus Timer',
    importance: AndroidImportance.LOW,
    sound: 'none',
    vibration: false,
  });
}

function buildDisplayNotification(params: TimerNotifParams, remaining: number) {
  const isBreak = params.sessionType === 'break';
  const isPaused = params.status === 'paused';
  const body =
    isPaused
      ? `Paused · ${formatMs(remaining)} left`
      : params.task || (isBreak ? 'Break in progress' : 'Focus in progress');

  return {
    id: NOTIF_ID,
    title: isBreak ? '☕ Break Time' : '🍅 Focus Session',
    body,
    data: toData(params),
    android: {
      channelId: CHANNEL_ID,
      ongoing: true,
      asForegroundService: true,
      onlyAlertOnce: true,
      category: AndroidCategory.PROGRESS,
      color: '#a78bfa',
      showChronometer: !isPaused,
      ...(isPaused
        ? {}
        : {
            chronometerDirection: 'down' as const,
            timestamp: Date.now() + remaining,
            timeoutAfter: remaining,
          }),
    },
  };
}

// Must be called at module level before any component renders
export function registerTimerForegroundService() {
  if (Platform.OS !== 'android' || !notifee) return;

  notifee.registerForegroundService(
    () =>
      new Promise<void>((resolve) => {
        resolveForegroundService?.();
        resolveForegroundService = resolve;
      }),
  );
}

export async function startTimerNotification(params: TimerNotifParams) {
  if (Platform.OS !== 'android' || !notifee) return;
  await setupChannel();
  const remaining = getRemainingMs(params);
  await notifee.displayNotification(buildDisplayNotification(params, remaining));
}

// Call on pause or resume to replace the native countdown with the current state.
export async function updateTimerNotification(params: TimerNotifParams) {
  if (Platform.OS !== 'android' || !notifee) return;
  const remaining = getRemainingMs(params);
  await notifee.displayNotification(buildDisplayNotification(params, remaining));
}

export async function stopTimerNotification() {
  if (Platform.OS !== 'android' || !notifee) return;
  resolveForegroundService?.();
  resolveForegroundService = null;
  try {
    await notifee.stopForegroundService();
  } catch {
    await notifee.cancelNotification(NOTIF_ID).catch(() => {});
  }
}
