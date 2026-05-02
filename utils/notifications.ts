import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let scheduledId: string | null = null;

export async function setupAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Focus Sessions',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#a78bfa',
      });
    } catch {
      // Channel setup failure is non-fatal — timer still works in foreground
    }
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    if (existing === 'denied') return false; // already denied — don't re-prompt
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleSessionEndNotification(
  dueInMs: number,
  type: 'focus' | 'break'
): Promise<void> {
  try {
    await cancelScheduledNotification();
    if (dueInMs <= 0) return;

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return; // silently skip — timer still works in foreground

    const title = type === 'focus' ? '🎉 Focus session complete!' : '⏰ Break time is over!';
    const body =
      type === 'focus'
        ? 'Great work! Your buddy gained XP. Time for a break.'
        : 'Your buddy is ready to focus again!';

    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(Date.now() + dueInMs),
      },
    });
    scheduledId = id;
  } catch {
    // Scheduling failure is non-fatal — in-app completion still fires
  }
}

export async function cancelScheduledNotification(): Promise<void> {
  if (scheduledId) {
    await Notifications.cancelScheduledNotificationAsync(scheduledId).catch(() => {});
    scheduledId = null;
  }
}

export async function fireCompletionAlarm(type: 'focus' | 'break'): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return; // in-app reward modal is the fallback

    const title = type === 'focus' ? '🎉 Focus session complete!' : '⏰ Break time is over!';
    const body =
      type === 'focus'
        ? 'Great work! Your buddy gained XP.'
        : 'Your buddy is ready to focus again!';
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null,
    });
  } catch {
    // Alarm failure is non-fatal — reward modal handles the completion signal
  }
}
