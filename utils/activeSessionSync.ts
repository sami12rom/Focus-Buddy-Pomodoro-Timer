import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const DEVICE_ID_KEY = '@focus_buddy_device_id';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

async function getDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = generateId();
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

// Call when a focus session starts
export async function syncSessionStart(): Promise<void> {
  try {
    const device_id = await getDeviceId();
    await supabase.from('active_sessions').upsert({ device_id });
  } catch {
    // Non-critical — silently ignore network errors
  }
}

// Call when a focus session ends or is cancelled
export async function syncSessionEnd(): Promise<void> {
  try {
    const device_id = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!device_id) return;
    await supabase.from('active_sessions').delete().eq('device_id', device_id);
  } catch {
    // Non-critical — silently ignore network errors
  }
}

// Call on app launch to remove any stale row left by a previous killed session
export async function cleanupStaleSession(): Promise<void> {
  try {
    const device_id = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!device_id) return;
    await supabase.from('active_sessions').delete().eq('device_id', device_id);
  } catch {
    // Ignore — best effort cleanup
  }
}

// Subscribe to live count changes. Returns an unsubscribe function.
export async function fetchFocusingCount(): Promise<number> {
  try {
    const { count } = await supabase
      .from('active_sessions')
      .select('*', { count: 'exact', head: true });
    return count ?? 0;
  } catch {
    return 0;
  }
}

export function subscribeToFocusingCount(onCount: (count: number) => void): () => void {
  fetchFocusingCount().then(onCount);

  const channel = supabase
    .channel('active_sessions_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'active_sessions' }, () => {
      fetchFocusingCount().then(onCount);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
