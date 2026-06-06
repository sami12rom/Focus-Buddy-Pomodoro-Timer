import { useCompanionStore } from '../store/companionStore';
import { useStatsStore } from '../store/statsStore';
import { useSessionStore } from '../store/sessionStore';
import { useSessionHistoryStore } from '../store/sessionHistoryStore';
import { useSettingsStore } from '../store/settingsStore';
import { useThemeStore } from '../store/themeStore';
import { useGoalStore } from '../store/goalStore';
import { useParkingLotStore } from '../store/parkingLotStore';

export function resetAllAppData(): void {
  useCompanionStore.getState().resetToDefaults();
  useStatsStore.getState().resetToDefaults();
  useSessionStore.getState().resetToDefaults();
  useSessionHistoryStore.getState().resetToDefaults();
  useSettingsStore.getState().resetToDefaults();
  useThemeStore.getState().resetToDefaults();
  useGoalStore.getState().resetToDefaults();
  useParkingLotStore.getState().resetToDefaults();
}
