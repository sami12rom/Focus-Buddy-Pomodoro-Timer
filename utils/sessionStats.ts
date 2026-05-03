import type { SessionHistoryEntry } from '../store/sessionHistoryStore';
import { getLocalDateKey } from './date';

export function getTodayFocusMinutes(entries: SessionHistoryEntry[], todayKey?: string): number {
  const key = todayKey ?? getLocalDateKey();
  return entries
    .filter((e) => e.date === key)
    .reduce((sum, e) => sum + e.durationMinutes, 0);
}

export function goalProgress(current: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(current / goal, 1);
}
