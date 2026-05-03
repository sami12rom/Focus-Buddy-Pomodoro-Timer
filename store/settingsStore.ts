import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  keepAwakeEnabled: boolean;
  autoStartBreak: boolean;
  ambientSound: string;
  ambientVolume: number;
  playAmbientDuringBreak: boolean;
}

interface SettingsActions {
  setSoundEnabled: (v: boolean) => void;
  setHapticsEnabled: (v: boolean) => void;
  setKeepAwakeEnabled: (v: boolean) => void;
  setAutoStartBreak: (v: boolean) => void;
  setAmbientSound: (id: string) => void;
  setAmbientVolume: (v: number) => void;
  setPlayAmbientDuringBreak: (v: boolean) => void;
  resetToDefaults: () => void;
}

const defaults: SettingsState = {
  soundEnabled: true,
  hapticsEnabled: true,
  keepAwakeEnabled: true,
  autoStartBreak: true,
  ambientSound: 'none',
  ambientVolume: 0.5,
  playAmbientDuringBreak: false,
};

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      ...defaults,
      setSoundEnabled: (v) => set({ soundEnabled: v }),
      setHapticsEnabled: (v) => set({ hapticsEnabled: v }),
      setKeepAwakeEnabled: (v) => set({ keepAwakeEnabled: v }),
      setAutoStartBreak: (v) => set({ autoStartBreak: v }),
      setAmbientSound: (id) => set({ ambientSound: id }),
      setAmbientVolume: (v) => set({ ambientVolume: v }),
      setPlayAmbientDuringBreak: (v) => set({ playAmbientDuringBreak: v }),
      resetToDefaults: () => set(defaults),
    }),
    {
      name: 'app-settings',
      storage: createJSONStorage(() => AsyncStorage),
      version: 3,
      migrate: (persisted: unknown, _fromVersion: number) => {
        const base = (persisted ?? {}) as Partial<SettingsState>;
        return { ...defaults, ...base };
      },
    }
  )
);
