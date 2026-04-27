export interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  unlocked: boolean;
}

interface AchievementInput {
  totalSessions: number;
  currentStreak: number;
  totalFocusMinutes: number;
  longBreaksCompleted: number;
  petDays: number;
}

function achievement(
  id: string,
  icon: string,
  title: string,
  description: string,
  progress: number,
  target: number
): Achievement {
  return {
    id,
    icon,
    title,
    description,
    progress: Math.min(progress, target),
    target,
    unlocked: progress >= target,
  };
}

export function getAchievements(input: AchievementInput): Achievement[] {
  return [
    achievement(
      'first-session',
      '✅',
      'First Focus',
      'Complete your first focus session',
      input.totalSessions,
      1
    ),
    achievement(
      'three-day-streak',
      '🔥',
      'Three-Day Spark',
      'Reach a 3-day focus streak',
      input.currentStreak,
      3
    ),
    achievement(
      'ten-sessions',
      '🎯',
      'Session Builder',
      'Complete 10 focus sessions',
      input.totalSessions,
      10
    ),
    achievement(
      'hundred-minutes',
      '⏱️',
      'Hundred-Minute Habit',
      'Log 100 focus minutes',
      input.totalFocusMinutes,
      100
    ),
    achievement(
      'first-long-break',
      '🌙',
      'Deep Rest',
      'Complete your first long break',
      input.longBreaksCompleted,
      1
    ),
    achievement(
      'pet-seven-days',
      '💛',
      'Companion Care',
      'Pet your companion on 7 different days',
      input.petDays,
      7
    ),
  ];
}
