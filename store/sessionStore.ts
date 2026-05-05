import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FOCUS_SESSIONS_BEFORE_LONG_BREAK,
  DEFAULT_LONG_BREAK_MINUTES,
} from '../constants/game';
import { DEFAULT_SESSION_TAG, SessionTag } from '../constants/sessionTags';

export type SessionStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'break_running'
  | 'break_paused';

// Persisted snapshot written on every meaningful state change.
// Used to offer resume or mark-complete after the app is killed mid-session.
export interface ActiveSessionSnapshot {
  type: 'focus' | 'break';
  status: 'running' | 'paused';
  startedAt: number;       // Date.now() when session started
  durationMs: number;      // full planned duration
  totalPausedMs: number;   // accumulated paused time (not including current pause)
  pausedAt: number | null; // wall time when currently paused, or null
  task: string;
  tag: SessionTag;
  createdAt: string;       // ISO string
  isLongBreak: boolean;
}

interface SessionState {
  // Active timer state (transient — not persisted)
  status: SessionStatus;
  startTime: number | null;
  pausedAt: number | null;
  totalPausedMs: number;
  activeDurationMs: number | null;
  breakInteracted: boolean;

  // User-chosen durations (persisted)
  selectedFocusMinutes: number;
  selectedBreakMinutes: number;
  selectedLongBreakMinutes: number;

  // Pomodoro cycle counter (transient — resets on kill, that's fine)
  completedFocusesInCycle: number;
  isCurrentBreakLong: boolean;

  // Recovery snapshot (persisted)
  activeSessionSnapshot: ActiveSessionSnapshot | null;

  // Current session task label (transient)
  currentTask: string;
  currentTag: SessionTag;
}

interface SessionActions {
  startFocus: () => void;
  pauseFocus: () => void;
  resumeFocus: () => void;
  // isManual=true skips long-break cycle check (for "Take a Break" button)
  startBreak: (isManual?: boolean) => number;
  pauseBreak: () => void;
  resumeBreak: () => void;
  interactDuringBreak: () => void;
  reset: () => void;
  cancelSession: () => void;

  setFocusMinutes: (n: number) => void;
  setBreakMinutes: (n: number) => void;
  setLongBreakMinutes: (n: number) => void;
  setCurrentTask: (task: string) => void;
  setCurrentTag: (tag: SessionTag) => void;
  extendFocusByMinutes: (minutes: number) => void;

  incrementCycle: () => void;
  resetCycle: () => void;
  clearSnapshot: () => void;
  resumeFromSnapshot: () => void;
  resetToDefaults: () => void;
}

const timerInitial = {
  status: 'idle' as SessionStatus,
  startTime: null,
  pausedAt: null,
  totalPausedMs: 0,
  activeDurationMs: null,
  breakInteracted: false,
  currentTask: '',
  currentTag: DEFAULT_SESSION_TAG,
  completedFocusesInCycle: 0,
  isCurrentBreakLong: false,
};

export const useSessionStore = create<SessionState & SessionActions>()(
  persist(
    (set, get) => ({
      ...timerInitial,
      selectedFocusMinutes: 25,
      selectedBreakMinutes: 5,
      selectedLongBreakMinutes: DEFAULT_LONG_BREAK_MINUTES,
      activeSessionSnapshot: null,

      startFocus: () => {
        const { selectedFocusMinutes, currentTask, currentTag } = get();
        const now = Date.now();
        const durationMs = selectedFocusMinutes * 60_000;
        set({
          status: 'running',
          startTime: now,
          pausedAt: null,
          totalPausedMs: 0,
          activeDurationMs: durationMs,
          activeSessionSnapshot: {
            type: 'focus',
            status: 'running',
            startedAt: now,
            durationMs,
            totalPausedMs: 0,
            pausedAt: null,
            task: currentTask,
            tag: currentTag,
            createdAt: new Date().toISOString(),
            isLongBreak: false,
          },
        });
      },

      pauseFocus: () => {
        const { activeSessionSnapshot } = get();
        const now = Date.now();
        set({
          status: 'paused',
          pausedAt: now,
          activeSessionSnapshot: activeSessionSnapshot
            ? { ...activeSessionSnapshot, status: 'paused', pausedAt: now }
            : null,
        });
      },

      resumeFocus: () => {
        const { pausedAt, totalPausedMs, activeSessionSnapshot } = get();
        const extra = pausedAt ? Date.now() - pausedAt : 0;
        const newTotal = totalPausedMs + extra;
        set({
          status: 'running',
          pausedAt: null,
          totalPausedMs: newTotal,
          activeSessionSnapshot: activeSessionSnapshot
            ? { ...activeSessionSnapshot, status: 'running', pausedAt: null, totalPausedMs: newTotal }
            : null,
        });
      },

      startBreak: (isManual = false) => {
        const {
          completedFocusesInCycle,
          selectedBreakMinutes,
          selectedLongBreakMinutes,
          currentTask,
          currentTag,
        } = get();
        const isLong = !isManual && completedFocusesInCycle >= FOCUS_SESSIONS_BEFORE_LONG_BREAK;
        const durationMs = (isLong ? selectedLongBreakMinutes : selectedBreakMinutes) * 60_000;
        const now = Date.now();
        set({
          status: 'break_running',
          startTime: now,
          pausedAt: null,
          totalPausedMs: 0,
          activeDurationMs: durationMs,
          breakInteracted: false,
          isCurrentBreakLong: isLong,
          activeSessionSnapshot: {
            type: 'break',
            status: 'running',
            startedAt: now,
            durationMs,
            totalPausedMs: 0,
            pausedAt: null,
            task: currentTask,
            tag: currentTag,
            createdAt: new Date().toISOString(),
            isLongBreak: isLong,
          },
        });
        return durationMs;
      },

      pauseBreak: () => {
        const { activeSessionSnapshot } = get();
        const now = Date.now();
        set({
          status: 'break_paused',
          pausedAt: now,
          activeSessionSnapshot: activeSessionSnapshot
            ? { ...activeSessionSnapshot, status: 'paused', pausedAt: now }
            : null,
        });
      },

      resumeBreak: () => {
        const { pausedAt, totalPausedMs, activeSessionSnapshot } = get();
        const extra = pausedAt ? Date.now() - pausedAt : 0;
        const newTotal = totalPausedMs + extra;
        set({
          status: 'break_running',
          pausedAt: null,
          totalPausedMs: newTotal,
          activeSessionSnapshot: activeSessionSnapshot
            ? { ...activeSessionSnapshot, status: 'running', pausedAt: null, totalPausedMs: newTotal }
            : null,
        });
      },

      interactDuringBreak: () => set({ breakInteracted: true }),

      reset: () => set({ ...timerInitial, activeSessionSnapshot: null }),

      cancelSession: () => set({ ...timerInitial, activeSessionSnapshot: null }),

      setFocusMinutes: (n) => set({ selectedFocusMinutes: n }),
      setBreakMinutes: (n) => set({ selectedBreakMinutes: n }),
      setLongBreakMinutes: (n) => set({ selectedLongBreakMinutes: n }),
      setCurrentTask: (task) => set({ currentTask: task }),
      setCurrentTag: (tag) => set({ currentTag: tag }),
      extendFocusByMinutes: (minutes) =>
        set((s) => {
          if (s.status !== 'running' && s.status !== 'paused') return {};
          const extraMs = minutes * 60_000;
          const activeDurationMs = (s.activeDurationMs ?? s.selectedFocusMinutes * 60_000) + extraMs;
          return {
            activeDurationMs,
            activeSessionSnapshot: s.activeSessionSnapshot?.type === 'focus'
              ? { ...s.activeSessionSnapshot, durationMs: activeDurationMs }
              : s.activeSessionSnapshot,
          };
        }),

      incrementCycle: () =>
        set((s) => ({ completedFocusesInCycle: s.completedFocusesInCycle + 1 })),

      resetCycle: () => set({ completedFocusesInCycle: 0 }),

      clearSnapshot: () => set({ activeSessionSnapshot: null }),

      resetToDefaults: () =>
        set({
          ...timerInitial,
          selectedFocusMinutes: 25,
          selectedBreakMinutes: 5,
          selectedLongBreakMinutes: DEFAULT_LONG_BREAK_MINUTES,
          activeSessionSnapshot: null,
        }),

      resumeFromSnapshot: () => {
        const { activeSessionSnapshot: snap } = get();
        if (!snap) return;
        if (snap.type === 'focus') {
          set({
            status: snap.status === 'running' ? 'running' : 'paused',
            startTime: snap.startedAt,
            pausedAt: snap.pausedAt,
            totalPausedMs: snap.totalPausedMs,
            activeDurationMs: snap.durationMs,
            currentTask: snap.task,
            currentTag: snap.tag ?? DEFAULT_SESSION_TAG,
          });
        } else {
          set({
            status: snap.status === 'running' ? 'break_running' : 'break_paused',
            startTime: snap.startedAt,
            pausedAt: snap.pausedAt,
            totalPausedMs: snap.totalPausedMs,
            activeDurationMs: snap.durationMs,
            isCurrentBreakLong: snap.isLongBreak,
            breakInteracted: false,
            currentTask: snap.task,
            currentTag: snap.tag ?? DEFAULT_SESSION_TAG,
          });
        }
      },
    }),
    {
      name: 'session-prefs',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: (persisted: unknown, fromVersion: number) => {
        const base = (persisted ?? {}) as Partial<SessionState>;
        if (fromVersion < 1) {
          return {
            selectedFocusMinutes: base.selectedFocusMinutes ?? 25,
            selectedBreakMinutes: base.selectedBreakMinutes ?? 5,
            selectedLongBreakMinutes: base.selectedLongBreakMinutes ?? DEFAULT_LONG_BREAK_MINUTES,
            activeSessionSnapshot: base.activeSessionSnapshot ?? null,
          };
        }
        return base;
      },
      partialize: (state) => ({
        selectedFocusMinutes: state.selectedFocusMinutes,
        selectedBreakMinutes: state.selectedBreakMinutes,
        selectedLongBreakMinutes: state.selectedLongBreakMinutes,
        activeSessionSnapshot: state.activeSessionSnapshot,
      }),
    }
  )
);
