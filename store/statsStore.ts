import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { computeNewStreak } from '../utils/gameLogic';
import { getLocalDateKey } from '../utils/date';

interface StatsState {
  totalSessions: number;
  todaySessions: number;
  totalFocusMinutes: number;
  currentStreak: number;
  bestStreak: number;
  lastSessionDate: string | null;
  lastActiveDate: string | null;
}

interface StatsActions {
  recordCompletedSession: (durationMinutes: number) => void;
  resetTodayIfNewDay: () => void;
  resetToDefaults: () => void;
}

function todayStr(): string {
  return getLocalDateKey();
}


const initialStats: StatsState = {
  totalSessions: 0,
  todaySessions: 0,
  totalFocusMinutes: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastSessionDate: null,
  lastActiveDate: null,
};

export const useStatsStore = create<StatsState & StatsActions>()(
  persist(
    (set, get) => ({
      ...initialStats,

      recordCompletedSession: (durationMinutes: number) => {
        const state = get();
        const today = todayStr();
        const last = state.lastSessionDate;

        const newStreak = computeNewStreak(state.currentStreak, last, today);
        const newTodaySessions = last === today ? state.todaySessions + 1 : 1;

        set({
          totalSessions: state.totalSessions + 1,
          todaySessions: newTodaySessions,
          totalFocusMinutes: state.totalFocusMinutes + durationMinutes,
          currentStreak: newStreak,
          bestStreak: Math.max(newStreak, state.bestStreak),
          lastSessionDate: today,
          lastActiveDate: today,
        });
      },

      resetToDefaults: () => set({ ...initialStats }),

      resetTodayIfNewDay: () => {
        const { lastActiveDate } = get();
        const today = todayStr();
        if (lastActiveDate && lastActiveDate !== today) {
          set({ todaySessions: 0, lastActiveDate: today });
        } else if (!lastActiveDate) {
          set({ lastActiveDate: today });
        }
      },
    }),
    {
      name: 'stats-store',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: (persisted: unknown, fromVersion: number) => {
        const base = (persisted ?? {}) as Partial<StatsState>;
        if (fromVersion < 1) {
          return { ...initialStats, ...base };
        }
        return base;
      },
    }
  )
);
