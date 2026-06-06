import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const PARKING_LOT_MAX = 50;

export interface ParkingLotItem {
  id: string;
  text: string;
  createdAt: string;
}

interface ParkingLotState {
  items: ParkingLotItem[];
}

interface ParkingLotActions {
  addItem: (text: string) => void;
  removeItem: (id: string) => void;
  clearAll: () => void;
  resetToDefaults: () => void;
}

function normalizeItems(items: unknown): ParkingLotItem[] {
  if (!Array.isArray(items)) return [];

  return items
    .filter((item): item is ParkingLotItem => {
      if (!item || typeof item !== 'object') return false;
      const candidate = item as Partial<ParkingLotItem>;
      return typeof candidate.id === 'string'
        && typeof candidate.text === 'string'
        && candidate.text.trim().length > 0
        && typeof candidate.createdAt === 'string';
    })
    .slice(0, PARKING_LOT_MAX);
}

export const useParkingLotStore = create<ParkingLotState & ParkingLotActions>()(
  persist(
    (set) => ({
      items: [],

      addItem: (text) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        const item: ParkingLotItem = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          text: trimmed,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ items: [item, ...state.items].slice(0, PARKING_LOT_MAX) }));
      },

      removeItem: (id) => {
        set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
      },

      clearAll: () => set({ items: [] }),

      resetToDefaults: () => set({ items: [] }),
    }),
    {
      name: 'parking-lot',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: (persisted: unknown, _fromVersion: number) => {
        const base = (persisted ?? {}) as Partial<ParkingLotState>;
        return { items: normalizeItems(base.items) };
      },
    }
  )
);
