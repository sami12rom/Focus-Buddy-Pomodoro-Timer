import { FOCUS_SESSIONS_BEFORE_LONG_BREAK, DAILY_HAPPINESS_DECAY, HAPPINESS_MIN } from '../constants/game';
import type { SessionHistoryEntry } from '../store/sessionHistoryStore';

// ── Streak ────────────────────────────────────────────────────────────────

export function computeNewStreak(
  currentStreak: number,
  lastSessionDate: string | null,
  today: string
): number {
  if (lastSessionDate === null) return 1;
  if (lastSessionDate === today) return currentStreak;

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (yesterday.toISOString().slice(0, 10) === lastSessionDate) return currentStreak + 1;

  return 1;
}

// ── Happiness decay ───────────────────────────────────────────────────────

export function shouldApplyDecay(
  today: string,
  lastDecayDate: string | null,
  lastSessionDate: string | null
): boolean {
  if (lastDecayDate === today) return false;

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  return lastSessionDate !== today && lastSessionDate !== yesterdayStr;
}

export function applyDecay(happiness: number): number {
  return Math.max(happiness - DAILY_HAPPINESS_DECAY, HAPPINESS_MIN);
}

// ── Pet daily limit ───────────────────────────────────────────────────────

export function canPetToday(lastPetDate: string | null, today: string): boolean {
  return lastPetDate !== today;
}

// ── 7-day bar chart aggregation ───────────────────────────────────────────

export interface DayBar {
  label: string;
  date: string;
  minutes: number;
}

export function getLast7Days(entries: SessionHistoryEntry[]): DayBar[] {
  const days: DayBar[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3);
    const minutes = entries
      .filter((e) => e.date === date)
      .reduce((sum, e) => sum + e.durationMinutes, 0);
    days.push({ label, date, minutes });
  }
  return days;
}

// ── Long break detection ──────────────────────────────────────────────────

export function isLongBreakDue(completedFocusesInCycle: number): boolean {
  return completedFocusesInCycle >= FOCUS_SESSIONS_BEFORE_LONG_BREAK;
}

// ── Recovery elapsed time ─────────────────────────────────────────────────

export function computeElapsedMs(
  startedAt: number,
  totalPausedMs: number,
  now: number = Date.now()
): number {
  return now - startedAt - totalPausedMs;
}
