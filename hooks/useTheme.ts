import { THEMES, AppTheme } from '../constants/colors';
import { useThemeStore } from '../store/themeStore';

export function useTheme(): AppTheme {
  const id = useThemeStore((s) => s.activeThemeId);
  return THEMES[id];
}
