export const FOCUS_DURATION_MS = 25 * 60 * 1000;
export const BREAK_DURATION_MS = 5 * 60 * 1000;

export const XP_PER_SESSION = 50;
export const HAPPINESS_PER_SESSION = 15;
export const HAPPINESS_PER_BREAK_INTERACTION = 5;
export const HAPPINESS_MAX = 100;

// Cumulative XP needed to *reach* each level (index 0 = level 1)
export const LEVEL_XP_THRESHOLDS = [0, 100, 250, 500, 900, 1400, 2000, 2700, 3500, 4400, 5400];

// Minimum level required to reach each evolution stage
export const EVOLUTION_THRESHOLDS: Record<number, number> = {
  1: 1,
  2: 3,
  3: 4,
  4: 10,
  5: 15,
};

export const EVOLUTION_STAGE_NAMES: Record<number, string> = {
  1: 'Egg',
  2: 'Baby',
  3: 'Child',
  4: 'Teen',
  5: 'Adult',
};

export const MOOD_HAPPY_THRESHOLD = 70;
export const MOOD_NEUTRAL_THRESHOLD = 40;

export const DEFAULT_COMPANION_NAME = 'Pomo';
export const INITIAL_HAPPINESS = 80;

export const HAPPINESS_PER_PET = 5;
export const DAILY_HAPPINESS_DECAY = 5;
export const HAPPINESS_MIN = 30;

// Pomodoro cycle: long break after this many focus sessions
export const FOCUS_SESSIONS_BEFORE_LONG_BREAK = 4;
export const DEFAULT_LONG_BREAK_MINUTES = 15;
export const LONG_BREAK_MINUTES_MIN = 5;
export const LONG_BREAK_MINUTES_MAX = 60;

// AsyncStorage cap for session history
export const SESSION_HISTORY_MAX = 100;
