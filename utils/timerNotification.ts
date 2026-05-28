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

function fromData(data: NotifData): TimerNotifParams & { active: boolean } {
  return {
    active: data.active === '1',
    status: data.status as 'running' | 'paused',
    startTime: Number(data.startTime),
    activeDurationMs: Number(data.activeDurationMs),
    totalPausedMs: Number(data.totalPausedMs),
    pausedAt: Number(data.pausedAt) || null,
    task: data.task ?? '',
    sessionType: data.sessionType as 'focus' | 'break',
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
  const body =
    params.status === 'paused'
      ? `Paused · ${formatMs(remaining)} left`
      : params.task
        ? `${params.task} · ${formatMs(remaining)} left`
        : `${formatMs(remaining)} remaining`;

  return {
    id: NOTIF_ID,
    title: isBreak ? '☕ Break Time' : '🍅 Focus Session',
    body,
    data: toData(params),
    android: {
      channelId: CHANNEL_ID,
      ongoing: true,
      asForegroundService: true,
      category: AndroidCategory.PROGRESS,
      color: '#a78bfa',
      progress: {
        max: Math.round(params.activeDurationMs / 1000),
        current: Math.round(Math.max(0, params.activeDurationMs - remaining) / 1000),
        indeterminate: false,
      },
    },
  };
}

// Must be called at module level before any component renders
export function registerTimerForegroundService() {
  if (Platform.OS !== 'android' || !notifee) return;

  notifee.registerForegroundService(() =>
    new Promise(async (resolve) => {
      const tick = async () => {
        const displayed = await notifee.getDisplayedNotifications();
        const current = displayed.find((n) => n.notification.id === NOTIF_ID);

        if (!current) { resolve(); return; }

        const raw = current.notification.data as NotifData | undefined;
        if (!raw || raw.active !== '1') { resolve(); return; }

        const params = fromData(raw);

        if (params.status === 'paused') {
          // Check frequently so resume is picked up quickly
          setTimeout(tick, 500);
          return;
        }

        const remaining = getRemainingMs(params);
        if (remaining <= 0) {
          // Timer expired — main thread handles session completion
          resolve();
          return;
        }

        await notifee.displayNotification(buildDisplayNotification(params, remaining));
        setTimeout(tick, 1000);
      };

      setTimeout(tick, 1000);
    })
  );
}

export async function startTimerNotification(params: TimerNotifParams) {
  if (Platform.OS !== 'android' || !notifee) return;
  await setupChannel();
  await notifee.displayNotification(buildDisplayNotification(params, params.activeDurationMs));
}

// Call on pause or resume — updates notification data so the service picks up the new state
export async function updateTimerNotification(params: TimerNotifParams) {
  if (Platform.OS !== 'android' || !notifee) return;
  const remaining = getRemainingMs(params);
  await notifee.displayNotification(buildDisplayNotification(params, remaining));
}

export async function stopTimerNotification() {
  if (Platform.OS !== 'android' || !notifee) return;
  await notifee.cancelNotification(NOTIF_ID);
}
