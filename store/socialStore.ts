import { create } from 'zustand';

interface SocialState {
  focusingCount: number;
  setFocusingCount: (count: number) => void;
}

export const useSocialStore = create<SocialState>()((set) => ({
  focusingCount: 0,
  setFocusingCount: (count) => set({ focusingCount: count }),
}));
