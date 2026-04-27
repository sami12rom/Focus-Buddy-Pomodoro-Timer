import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  keepAwakeEnabled: boolean;
}

interface SettingsActions {
  setSoundEnabled: (v: boolean) => void;
  setHapticsEnabled: (v: boolean) => void;
  setKeepAwakeEnabled: (v: boolean) => void;
  resetToDefaults: () => void;
}

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      soundEnabled: true,
      hapticsEnabled: true,
      keepAwakeEnabled: true,
      setSoundEnabled: (v) => set({ soundEnabled: v }),
      setHapticsEnabled: (v) => set({ hapticsEnabled: v }),
      setKeepAwakeEnabled: (v) => set({ keepAwakeEnabled: v }),
      resetToDefaults: () => set({ soundEnabled: true, hapticsEnabled: true, keepAwakeEnabled: true }),
    }),
    {
      name: 'app-settings',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: (persisted: unknown, fromVersion: number) => {
        const base = (persisted ?? {}) as Partial<SettingsState>;
        if (fromVersion < 1) {
          return {
            soundEnabled: base.soundEnabled ?? true,
            hapticsEnabled: base.hapticsEnabled ?? true,
            keepAwakeEnabled: base.keepAwakeEnabled ?? true,
          };
        }
        return base;
      },
    }
  )
);
