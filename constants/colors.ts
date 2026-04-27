export type ThemeId = 'cosmic' | 'kawaii' | 'ember' | 'retro';

export interface AppTheme {
  id: ThemeId;
  name: string;
  // Backgrounds
  bg: string;
  surface: string;
  surfaceRaised: string;
  // Focus mode
  focusBg: string;
  focusAccent: string;
  focusTabBg: string;
  // Break mode
  breakBg: string;
  breakAccent: string;
  breakTabBg: string;
  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;
  // Borders
  border: string;
  borderSubtle: string;
  // Semantic accents
  xpGold: string;
  streak: string;
  energy: string;
  happiness: string;
  today: string;
  // Mood
  moodHappy: string;
  moodNeutral: string;
  moodTired: string;
  // Companion stage ring colors (glow = ring + '30')
  stage1Ring: string;
  stage2Ring: string;
  stage3Ring: string;
  stage4Ring: string;
  stage5Ring: string;
  // Dev
  devAccent: string;
}

const cosmic: AppTheme = {
  id: 'cosmic',
  name: 'Cosmic Night',
  bg: '#080D1A',
  surface: '#0F1729',
  surfaceRaised: '#162035',
  focusBg: '#080D1A',
  focusAccent: '#7C6FF1',
  focusTabBg: '#111B2E',
  breakBg: '#060F0B',
  breakAccent: '#2DD4A6',
  breakTabBg: '#0A1F16',
  textPrimary: '#EEF2FF',
  textSecondary: '#8892A8',
  textMuted: '#4D5A73',
  textDisabled: '#2E3A4E',
  border: '#1E2D45',
  borderSubtle: '#141E30',
  xpGold: '#FBBF24',
  streak: '#FB923C',
  energy: '#2DD4A6',
  happiness: '#FBBF24',
  today: '#60A5FA',
  moodHappy: '#34D399',
  moodNeutral: '#FBBF24',
  moodTired: '#8892A8',
  stage1Ring: '#7C6FF1',
  stage2Ring: '#2DD4A6',
  stage3Ring: '#60A5FA',
  stage4Ring: '#FB923C',
  stage5Ring: '#FBBF24',
  devAccent: '#FB923C',
};

const kawaii: AppTheme = {
  id: 'kawaii',
  name: 'Kawaii Dusk',
  bg: '#0D0B14',
  surface: '#170F2A',
  surfaceRaised: '#1E1438',
  focusBg: '#0D0B14',
  focusAccent: '#E879F9',
  focusTabBg: '#1A0D2E',
  breakBg: '#080F0C',
  breakAccent: '#34D399',
  breakTabBg: '#0C1A14',
  textPrimary: '#FAF5FF',
  textSecondary: '#C4B5FD',
  textMuted: '#6D5EA6',
  textDisabled: '#3D2E5E',
  border: '#2D1F4A',
  borderSubtle: '#1A1238',
  xpGold: '#FBBF24',
  streak: '#F472B6',
  energy: '#34D399',
  happiness: '#F472B6',
  today: '#A78BFA',
  moodHappy: '#34D399',
  moodNeutral: '#FBBF24',
  moodTired: '#C4B5FD',
  stage1Ring: '#E879F9',
  stage2Ring: '#34D399',
  stage3Ring: '#A78BFA',
  stage4Ring: '#F472B6',
  stage5Ring: '#FBBF24',
  devAccent: '#F472B6',
};

const ember: AppTheme = {
  id: 'ember',
  name: 'Ember Dark',
  bg: '#0C0A07',
  surface: '#161009',
  surfaceRaised: '#1F1710',
  focusBg: '#0C0A07',
  focusAccent: '#F97316',
  focusTabBg: '#1C1108',
  breakBg: '#060B07',
  breakAccent: '#4ADE80',
  breakTabBg: '#081209',
  textPrimary: '#FEF3C7',
  textSecondary: '#A8916E',
  textMuted: '#5C4A32',
  textDisabled: '#3A2C1C',
  border: '#2C1F10',
  borderSubtle: '#1A1208',
  xpGold: '#EAB308',
  streak: '#EF4444',
  energy: '#4ADE80',
  happiness: '#EAB308',
  today: '#60A5FA',
  moodHappy: '#4ADE80',
  moodNeutral: '#EAB308',
  moodTired: '#A8916E',
  stage1Ring: '#F97316',
  stage2Ring: '#4ADE80',
  stage3Ring: '#60A5FA',
  stage4Ring: '#EF4444',
  stage5Ring: '#EAB308',
  devAccent: '#EF4444',
};

const retro: AppTheme = {
  id: 'retro',
  name: 'Retro Pixel',
  bg: '#050508',
  surface: '#0D0D14',
  surfaceRaised: '#14141F',
  focusBg: '#050508',
  focusAccent: '#00D4FF',
  focusTabBg: '#0A0E18',
  breakBg: '#050908',
  breakAccent: '#39FF14',
  breakTabBg: '#081208',
  textPrimary: '#E8F0FF',
  textSecondary: '#6080A0',
  textMuted: '#303850',
  textDisabled: '#1E2535',
  border: '#1A2535',
  borderSubtle: '#10181E',
  xpGold: '#FFD700',
  streak: '#FF2D55',
  energy: '#39FF14',
  happiness: '#FFD700',
  today: '#00D4FF',
  moodHappy: '#39FF14',
  moodNeutral: '#FFD700',
  moodTired: '#6080A0',
  stage1Ring: '#00D4FF',
  stage2Ring: '#39FF14',
  stage3Ring: '#A855F7',
  stage4Ring: '#FF2D55',
  stage5Ring: '#FFD700',
  devAccent: '#FF2D55',
};

export const THEMES: Record<ThemeId, AppTheme> = { cosmic, kawaii, ember, retro };
export const THEME_LIST: AppTheme[] = [cosmic, kawaii, ember, retro];

export function getSessionTheme(t: AppTheme, mode: 'focus' | 'break') {
  return mode === 'focus'
    ? { bg: t.focusBg, accent: t.focusAccent, tabBg: t.focusTabBg, label: 'Focus' }
    : { bg: t.breakBg, accent: t.breakAccent, tabBg: t.breakTabBg, label: 'Short Break' };
}
