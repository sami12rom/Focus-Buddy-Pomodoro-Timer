import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AmbientSoundId } from '../constants/sounds';

interface SettingsState {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  keepAwakeEnabled: boolean;
  autoStartBreak: boolean;
  ambientSounds: AmbientSoundId[];
  ambientVolume: number;
  playAmbientDuringBreak: boolean;
}

interface SettingsActions {
  setSoundEnabled: (v: boolean) => void;
  setHapticsEnabled: (v: boolean) => void;
  setKeepAwakeEnabled: (v: boolean) => void;
  setAutoStartBreak: (v: boolean) => void;
  setAmbientSounds: (ids: AmbientSoundId[]) => void;
  toggleAmbientSound: (id: AmbientSoundId) => void;
  setAmbientVolume: (v: number) => void;
  setPlayAmbientDuringBreak: (v: boolean) => void;
  resetToDefaults: () => void;
}

const defaults: SettingsState = {
  soundEnabled: true,
  hapticsEnabled: true,
  keepAwakeEnabled: true,
  autoStartBreak: true,
  ambientSounds: [],
  ambientVolume: 0.5,
  playAmbientDuringBreak: false,
};

function normalizeAmbientSounds(ids: unknown): AmbientSoundId[] {
  if (!Array.isArray(ids)) return [];
  const validIds: AmbientSoundId[] = ['rain', 'coffee', 'whitenoise', 'forest', 'brownnoise'];
  return ids.filter((id): id is AmbientSoundId => validIds.includes(id as AmbientSoundId)).slice(-2);
}

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      ...defaults,
      setSoundEnabled: (v) => set({ soundEnabled: v }),
      setHapticsEnabled: (v) => set({ hapticsEnabled: v }),
      setKeepAwakeEnabled: (v) => set({ keepAwakeEnabled: v }),
      setAutoStartBreak: (v) => set({ autoStartBreak: v }),
      setAmbientSounds: (ids) => set({ ambientSounds: normalizeAmbientSounds(ids) }),
      toggleAmbientSound: (id) => set((state) => {
        if (id === 'none') return { ambientSounds: [] };
        const current = state.ambientSounds;
        if (current.includes(id)) {
          return { ambientSounds: current.filter((soundId) => soundId !== id) };
        }
        return { ambientSounds: [...current, id].slice(-2) };
      }),
      setAmbientVolume: (v) => set({ ambientVolume: v }),
      setPlayAmbientDuringBreak: (v) => set({ playAmbientDuringBreak: v }),
      resetToDefaults: () => set(defaults),
    }),
    {
      name: 'app-settings',
      storage: createJSONStorage(() => AsyncStorage),
      version: 4,
      migrate: (persisted: unknown, _fromVersion: number) => {
        const base = (persisted ?? {}) as Partial<SettingsState> & { ambientSound?: AmbientSoundId };
        const migratedSounds = normalizeAmbientSounds(
          base.ambientSounds ?? (base.ambientSound && base.ambientSound !== 'none' ? [base.ambientSound] : [])
        );
        const { ambientSound: _ambientSound, ...rest } = base;
        return { ...defaults, ...rest, ambientSounds: migratedSounds };
      },
    }
  )
);
