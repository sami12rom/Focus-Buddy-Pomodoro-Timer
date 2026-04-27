import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  XP_PER_SESSION,
  ENERGY_PER_SESSION,
  HAPPINESS_PER_SESSION,
  HAPPINESS_PER_BREAK_INTERACTION,
  HAPPINESS_PER_PET,
  ENERGY_MAX,
  HAPPINESS_MAX,
  DEFAULT_COMPANION_NAME,
  INITIAL_ENERGY,
  INITIAL_HAPPINESS,
} from '../constants/game';
import { getLevelForXP, getEvolutionStage } from '../utils/xp';
import { shouldApplyDecay, applyDecay, canPetToday } from '../utils/gameLogic';

interface CompanionState {
  name: string;
  level: number;
  xp: number;
  energy: number;
  happiness: number;
  evolutionStage: 1 | 2 | 3 | 4 | 5;
  createdAt: string;
  isHydrated: boolean;
  hasCompletedOnboarding: boolean;
  lastPetDate: string | null;
  lastDecayDate: string | null;
}

export interface FocusRewardResult {
  xpGained: number;
  energyGained: number;
  happinessGained: number;
  leveledUp: boolean;
  newLevel: number;
  evolved: boolean;
  newStage: 1 | 2 | 3 | 4 | 5;
}

interface CompanionActions {
  applyFocusReward: () => FocusRewardResult;
  applyBreakInteraction: () => void;
  setName: (name: string) => void;
  setHydrated: () => void;
  completeOnboarding: (name: string) => void;
  petCompanion: () => { happinessIncreased: boolean };
  applyDailyCareCheck: (today: string, lastSessionDate: string | null) => void;
  resetToDefaults: () => void;
}

const initialState: Omit<CompanionState, 'isHydrated'> = {
  name: DEFAULT_COMPANION_NAME,
  level: 1,
  xp: 0,
  energy: INITIAL_ENERGY,
  happiness: INITIAL_HAPPINESS,
  evolutionStage: 1,
  createdAt: new Date().toISOString(),
  hasCompletedOnboarding: false,
  lastPetDate: null,
  lastDecayDate: null,
};

export const useCompanionStore = create<CompanionState & CompanionActions>()(
  persist(
    (set, get) => ({
      ...initialState,
      isHydrated: false,

      applyFocusReward: () => {
        const state = get();
        const oldLevel = state.level;
        const oldStage = state.evolutionStage;

        const newXP = state.xp + XP_PER_SESSION;
        const newEnergy = Math.min(state.energy + ENERGY_PER_SESSION, ENERGY_MAX);
        const newHappiness = Math.min(state.happiness + HAPPINESS_PER_SESSION, HAPPINESS_MAX);
        const newLevel = getLevelForXP(newXP);
        const newStage = getEvolutionStage(newLevel);

        set({ xp: newXP, energy: newEnergy, happiness: newHappiness, level: newLevel, evolutionStage: newStage });

        return {
          xpGained: XP_PER_SESSION,
          energyGained: ENERGY_PER_SESSION,
          happinessGained: HAPPINESS_PER_SESSION,
          leveledUp: newLevel > oldLevel,
          newLevel,
          evolved: newStage > oldStage,
          newStage,
        };
      },

      applyBreakInteraction: () => {
        const { happiness } = get();
        set({ happiness: Math.min(happiness + HAPPINESS_PER_BREAK_INTERACTION, HAPPINESS_MAX) });
      },

      setName: (name) => set({ name }),

      setHydrated: () => set({ isHydrated: true }),

      completeOnboarding: (name: string) => {
        const trimmed = name.trim() || DEFAULT_COMPANION_NAME;
        set({ name: trimmed, hasCompletedOnboarding: true });
      },

      petCompanion: () => {
        const { happiness, lastPetDate } = get();
        const today = new Date().toISOString().slice(0, 10);
        if (!canPetToday(lastPetDate, today)) {
          return { happinessIncreased: false };
        }
        set({
          happiness: Math.min(happiness + HAPPINESS_PER_PET, HAPPINESS_MAX),
          lastPetDate: today,
        });
        return { happinessIncreased: true };
      },

      resetToDefaults: () => set({ ...initialState, isHydrated: true }),

      applyDailyCareCheck: (today: string, lastSessionDate: string | null) => {
        const { lastDecayDate, happiness } = get();
        if (!shouldApplyDecay(today, lastDecayDate, lastSessionDate)) {
          if (lastDecayDate !== today) set({ lastDecayDate: today });
          return;
        }
        set({ happiness: applyDecay(happiness), lastDecayDate: today });
      },
    }),
    {
      name: 'companion-store',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: (persisted: unknown, fromVersion: number) => {
        const base = (persisted ?? {}) as Partial<CompanionState>;
        if (fromVersion < 1) {
          return {
            ...initialState,
            ...base,
            lastPetDate: base.lastPetDate ?? null,
            lastDecayDate: base.lastDecayDate ?? null,
          };
        }
        return base;
      },
      onRehydrateStorage: () => (state) => {
        if (state) state.isHydrated = true;
      },
    }
  )
);
