import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SESSION_HISTORY_MAX } from '../constants/game';
import { DEFAULT_SESSION_TAG, SessionTag } from '../constants/sessionTags';

export type GoalOutcome = 'done' | 'partial' | 'no';

export interface SessionHistoryEntry {
  id: string;
  date: string;            // YYYY-MM-DD
  task: string;
  tag: SessionTag;
  durationMinutes: number;
  completedAt: string;     // ISO timestamp
  goalOutcome?: GoalOutcome;
  recovered?: boolean;     // true if user tapped "I'm back" during the session
}

interface SessionHistoryState {
  entries: SessionHistoryEntry[];
}

interface SessionHistoryActions {
  // Only call this for completed focus sessions — not cancelled, not break
  addEntry: (entry: Omit<SessionHistoryEntry, 'id'>) => string;
  updateEntryOutcome: (id: string, outcome: GoalOutcome) => void;
  clearHistory: () => void;
  resetToDefaults: () => void;
}

export const useSessionHistoryStore = create<SessionHistoryState & SessionHistoryActions>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntry: (entry): string => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const updated = [{ ...entry, id }, ...get().entries].slice(0, SESSION_HISTORY_MAX);
        set({ entries: updated });
        return id;
      },

      updateEntryOutcome: (id, outcome) => {
        set({
          entries: get().entries.map((e) => e.id === id ? { ...e, goalOutcome: outcome } : e),
        });
      },

      clearHistory: () => set({ entries: [] }),

      resetToDefaults: () => set({ entries: [] }),
    }),
    {
      name: 'session-history',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: (persisted: unknown, fromVersion: number) => {
        const base = (persisted ?? {}) as Partial<SessionHistoryState>;
        if (fromVersion < 1) {
          return {
            entries: Array.isArray(base.entries)
              ? base.entries.map((entry) => ({ ...entry, tag: entry.tag ?? DEFAULT_SESSION_TAG }))
              : [],
          };
        }
        return {
          entries: Array.isArray(base.entries)
            ? base.entries.map((entry) => ({ ...entry, tag: entry.tag ?? DEFAULT_SESSION_TAG }))
            : [],
        };
      },
    }
  )
);
