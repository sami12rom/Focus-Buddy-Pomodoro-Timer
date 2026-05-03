export interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  unlocked: boolean;
}

export interface AchievementInput {
  totalSessions: number;
  currentStreak: number;
  bestStreak: number;
  totalFocusMinutes: number;
  longBreaksCompleted: number;
  petDays: number;
  unlockedIds?: string[];
}

function achievement(
  id: string,
  icon: string,
  title: string,
  description: string,
  progress: number,
  target: number,
  unlockedIds: string[],
): Achievement {
  const permanent = unlockedIds.includes(id);
  return {
    id,
    icon,
    title,
    description,
    progress: permanent ? target : Math.min(progress, target),
    target,
    unlocked: permanent || progress >= target,
  };
}

export function getAchievements(input: AchievementInput): Achievement[] {
  const ids = input.unlockedIds ?? [];
  const s = input.totalSessions;
  const streak = Math.max(input.currentStreak, input.bestStreak);
  const mins = input.totalFocusMinutes;
  const lb = input.longBreaksCompleted;
  const pets = input.petDays;

  return [
    // ── Easy ──────────────────────────────────────────────────────────────
    achievement('first-session',    '✅', 'First Focus',          'Complete your first focus session',         s,      1,   ids),
    achievement('deep-rest',        '🌙', 'Deep Rest',            'Complete your first long break',            lb,     1,   ids),
    achievement('three-day-streak', '🔥', 'Three-Day Spark',      'Reach a 3-day streak',                      streak, 3,   ids),
    achievement('hundred-minutes',  '⏱️', 'Hundred-Minute Habit', 'Log 100 minutes of focus',                  mins,   100, ids),
    achievement('ten-sessions',     '🎯', 'Session Builder',      'Complete 10 focus sessions',                s,      10,  ids),

    // ── Medium ─────────────────────────────────────────────────────────────
    achievement('seven-day-streak',    '🔥', 'Week Warrior',       'Reach a 7-day streak',           streak, 7,   ids),
    achievement('twenty-five-sessions','🎯', 'Session Regular',    'Complete 25 focus sessions',     s,      25,  ids),
    achievement('five-hundred-minutes','⏱️', 'Focus Enthusiast',   'Log 500 minutes of focus',       mins,   500, ids),
    achievement('five-long-breaks',    '🌙', 'Rest Ritual',        'Complete 5 long breaks',         lb,     5,   ids),
    achievement('companion-care',      '💛', 'Companion Care',     'Pet your companion on 7 days',   pets,   7,   ids),
    achievement('fourteen-pet-days',   '💛', 'Devoted Friend',     'Pet your companion on 14 days',  pets,   14,  ids),

    // ── Hard ───────────────────────────────────────────────────────────────
    achievement('fifty-sessions',       '🏆', 'Session Pro',       'Complete 50 focus sessions',      s,      50,   ids),
    achievement('fourteen-day-streak',  '🔥', 'Fortnight Flame',   'Reach a 14-day streak',           streak, 14,   ids),
    achievement('thousand-minutes',     '⏱️', 'Time Keeper',       'Log 1000 minutes of focus',       mins,   1000, ids),
    achievement('ten-long-breaks',      '🌙', 'Break Master',      'Complete 10 long breaks',         lb,     10,   ids),
    achievement('thirty-pet-days',      '💛', 'Soul Bond',         'Pet your companion on 30 days',   pets,   30,   ids),

    // ── Legendary ──────────────────────────────────────────────────────────
    achievement('hundred-sessions',     '👑', 'Century Club',      'Complete 100 focus sessions',     s,      100,  ids),
    achievement('thirty-day-streak',    '🔥', 'Monthly Mindset',   'Reach a 30-day streak',           streak, 30,   ids),
    achievement('five-thousand-minutes','⏱️', 'Marathon Focuser',  'Log 5000 minutes of focus',       mins,   5000, ids),
    achievement('two-hundred-sessions', '👑', 'Session Legend',    'Complete 200 focus sessions',     s,      200,  ids),
  ];
}
