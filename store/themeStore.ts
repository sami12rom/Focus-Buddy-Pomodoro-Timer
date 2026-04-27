import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeId } from '../constants/colors';

interface ThemeState {
  activeThemeId: ThemeId;
  setTheme: (id: ThemeId) => void;
  resetToDefaults: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      activeThemeId: 'cosmic',
      setTheme: (id) => set({ activeThemeId: id }),
      resetToDefaults: () => set({ activeThemeId: 'cosmic' }),
    }),
    {
      name: 'app-theme',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: (persisted: unknown, fromVersion: number) => {
        const base = (persisted ?? {}) as Partial<ThemeState>;
        if (fromVersion < 1) {
          return { activeThemeId: base.activeThemeId ?? 'cosmic' };
        }
        return base;
      },
    }
  )
);
