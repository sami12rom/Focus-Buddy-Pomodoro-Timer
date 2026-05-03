import { addDaysToLocalDateKey, getLocalDateKey } from './date';

export interface DialogueContext {
  name: string;
  evolutionStage: number;   // 1–5
  happiness: number;        // 0–100
  currentStreak: number;
  todaySessions: number;
  dailySessionGoal: number;
  lastSessionDate: string | null;
  hourOfDay: number;        // 0–23
}

// Stage-voiced wrappers: same sentiment, different personality
type StageVoices = [string, string, string, string, string]; // stages 1–5

function byStage(stage: number, voices: StageVoices): string {
  return voices[Math.min(stage, 5) - 1];
}

// Seeded shuffle so the fallback message is stable for the day but changes daily
function dailySeed(): number {
  const today = getLocalDateKey();
  return today.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

function pickFromPool(pool: string[], extra = 0): string {
  return pool[(dailySeed() + extra) % pool.length];
}

// ── Message pools ─────────────────────────────────────────────────────────

const MORNING_GREETINGS: StageVoices = [
  'Good morning! Tap me when you\'re ready 🐣',
  'Morning! Let\'s make today count ☀️',
  'Good morning! Ready to do something great?',
  'Morning. I\'ve been waiting for you.',
  'Good morning. Let\'s make this day count.',
];

const AFTERNOON_GREETINGS: StageVoices = [
  'Hey! Still time for a great session 🐾',
  'Afternoon already! Let\'s get focused.',
  'Hey! The afternoon is yours. Use it well.',
  'Still plenty of day left. Let\'s focus.',
  'Good afternoon. Focus while the day is here.',
];

const EVENING_GREETINGS: StageVoices = [
  'Evening! One session before bed? 🌙',
  'Evening! Even one session counts.',
  'Evening already. Still time to get something done.',
  'The day\'s winding down. Make the most of it.',
  'Evening. One focused session and you\'re done.',
];

const FALLBACK_POOLS: StageVoices = [
  '...I believe in you! 🐣',
  'I\'m here whenever you\'re ready.',
  'Consistency is how we both grow.',
  'Every session matters. You know this.',
  'The focused life is a good life.',
];

// ── Main function ─────────────────────────────────────────────────────────

export function getCompanionMessage(ctx: DialogueContext): string {
  const {
    name: _name,
    evolutionStage: stage,
    happiness,
    currentStreak,
    todaySessions,
    dailySessionGoal,
    lastSessionDate,
    hourOfDay,
  } = ctx;

  const today = getLocalDateKey();

  // 1. Absence — highest emotional weight
  if (lastSessionDate) {
    const twoDaysAgo = addDaysToLocalDateKey(today, -2);
    const threeDaysAgo = addDaysToLocalDateKey(today, -3);
    if (lastSessionDate <= threeDaysAgo) {
      return byStage(stage, [
        'I missed you so much! Come back? 🥺',
        'You\'ve been away… I was worried.',
        'It\'s been a while. Let\'s ease back in together.',
        'I noticed you\'ve been gone. Just glad you\'re back.',
        'Absence makes the focus sharper. Welcome back.',
      ]);
    }
    if (lastSessionDate === twoDaysAgo) {
      return byStage(stage, [
        'Yesterday was quiet without you 🐾',
        'Yesterday was quiet. Ready to get back?',
        'Yesterday slipped by. Today won\'t.',
        'I missed you yesterday. Let\'s make today count.',
        'Yesterday\'s sessions are gone. Today\'s are yours to take.',
      ]);
    }
  }

  // 2. Low happiness
  if (happiness < 40) {
    return byStage(stage, [
      'I\'m feeling a little sad… can we focus together? 💛',
      'I\'m a bit down. A session would cheer me up.',
      'I could use some focus time with you right now.',
      'My happiness is slipping. Let\'s do a session.',
      'I need this. Let\'s focus.',
    ]);
  }

  // 3. Streak milestones
  const STREAK_MILESTONES = [3, 7, 14, 21, 30, 50, 100];
  if (STREAK_MILESTONES.includes(currentStreak)) {
    const days = currentStreak;
    return byStage(stage, [
      `${days} days in a row!! You're amazing! 🔥`,
      `${days} days straight! I\'m so proud of you!`,
      `${days} days in a row. That\'s real dedication.`,
      `${days}-day streak. You\'ve earned the right to feel good about this.`,
      `${days} consecutive days. Discipline like this is rare.`,
    ]);
  }

  // 4. Daily goal hit
  if (todaySessions >= dailySessionGoal) {
    return byStage(stage, [
      'Goal crushed!! You did it today!! 🎉',
      'You hit your goal! Take a well-earned rest.',
      'Daily goal done. You showed up and delivered.',
      'Goal complete. That\'s what consistency looks like.',
      'Today\'s goal is done. Well executed.',
    ]);
  }

  // 5. One session away from goal
  if (dailySessionGoal - todaySessions === 1) {
    return byStage(stage, [
      'One more session and we hit the goal! 💪',
      'One more session for today\'s goal. You\'ve got this.',
      'One session away. Finish what you started.',
      'One more. Close it out.',
      'One session stands between you and today\'s goal.',
    ]);
  }

  // 6. Momentum — already has sessions today
  if (todaySessions > 0) {
    const sessionWord = todaySessions === 1 ? '1 session' : `${todaySessions} sessions`;
    return byStage(stage, [
      `${sessionWord} done! Keep going! ⭐`,
      `${sessionWord} in. Great momentum!`,
      `${sessionWord} done today. Keep the rhythm.`,
      `${sessionWord} today. Stay sharp.`,
      `${sessionWord} completed. The day is going well.`,
    ]);
  }

  // 7. First session prompt — time-of-day aware
  if (hourOfDay >= 5 && hourOfDay < 12) {
    return byStage(stage, MORNING_GREETINGS);
  }
  if (hourOfDay >= 12 && hourOfDay < 18) {
    return byStage(stage, AFTERNOON_GREETINGS);
  }
  if (hourOfDay >= 18 && hourOfDay < 23) {
    return byStage(stage, EVENING_GREETINGS);
  }

  // 8. Fallback pool — stable for the day
  return pickFromPool([
    byStage(stage, FALLBACK_POOLS),
    byStage(stage, [
      'Tap me when you\'re ready 🐾',
      'I\'m here whenever you need me.',
      'We grow together through focus.',
      'Whenever you\'re ready, I\'m here.',
      'Readiness is the first step.',
    ]),
  ]);
}
