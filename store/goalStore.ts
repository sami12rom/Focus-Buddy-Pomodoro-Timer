import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface GoalState {
  dailySessionGoal: number;
  dailyMinuteGoal: number;
}

interface GoalActions {
  setDailySessionGoal: (goal: number) => void;
  setDailyMinuteGoal: (goal: number) => void;
  resetToDefaults: () => void;
}

const initialGoals: GoalState = {
  dailySessionGoal: 2,
  dailyMinuteGoal: 60,
};

function clampGoal(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export const useGoalStore = create<GoalState & GoalActions>()(
  persist(
    (set) => ({
      ...initialGoals,
      setDailySessionGoal: (goal) => set({ dailySessionGoal: clampGoal(goal, 1, 12) }),
      setDailyMinuteGoal: (goal) => set({ dailyMinuteGoal: clampGoal(goal, 15, 480) }),
      resetToDefaults: () => set({ ...initialGoals }),
    }),
    {
      name: 'goal-store',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: (persisted: unknown, fromVersion: number) => {
        const base = (persisted ?? {}) as Partial<GoalState>;
        if (fromVersion < 1) {
          return {
            dailySessionGoal: base.dailySessionGoal ?? initialGoals.dailySessionGoal,
            dailyMinuteGoal: base.dailyMinuteGoal ?? initialGoals.dailyMinuteGoal,
          };
        }
        return base;
      },
    }
  )
);
