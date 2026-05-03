import { getCompanionMessage, DialogueContext } from '../companionDialogue';
import { getLocalDateKey, addDaysToLocalDateKey } from '../date';

const TODAY = getLocalDateKey();
const YESTERDAY = addDaysToLocalDateKey(TODAY, -1);
const TWO_DAYS_AGO = addDaysToLocalDateKey(TODAY, -2);
const THREE_DAYS_AGO = addDaysToLocalDateKey(TODAY, -3);

function ctx(overrides: Partial<DialogueContext> = {}): DialogueContext {
  return {
    name: 'Pomo',
    evolutionStage: 3,
    happiness: 80,
    currentStreak: 0,
    todaySessions: 0,
    dailySessionGoal: 4,
    lastSessionDate: TODAY,
    hourOfDay: 10,
    ...overrides,
  };
}

describe('getCompanionMessage', () => {
  describe('priority 1: absence', () => {
    it('returns absence message when last session was 3+ days ago', () => {
      const msg = getCompanionMessage(ctx({ lastSessionDate: THREE_DAYS_AGO }));
      expect(typeof msg).toBe('string');
      expect(msg.length).toBeGreaterThan(0);
    });

    it('returns 2-day absence message when last session was 2 days ago', () => {
      const msg = getCompanionMessage(ctx({ lastSessionDate: TWO_DAYS_AGO }));
      expect(msg).toMatch(/yesterday|quiet/i);
    });
  });

  describe('priority 2: low happiness', () => {
    it('returns low happiness message when happiness < 40', () => {
      const msg = getCompanionMessage(ctx({ happiness: 39, lastSessionDate: TODAY }));
      expect(msg).toMatch(/sad|down|focus|happiness/i);
    });

    it('does not return low happiness message at exactly 40', () => {
      const msg1 = getCompanionMessage(ctx({ happiness: 40, lastSessionDate: TODAY, todaySessions: 0, hourOfDay: 10 }));
      const msg2 = getCompanionMessage(ctx({ happiness: 39, lastSessionDate: TODAY, todaySessions: 0, hourOfDay: 10 }));
      expect(msg1).not.toBe(msg2);
    });
  });

  describe('priority 3: streak milestones', () => {
    it('returns streak message at 3-day milestone', () => {
      const msg = getCompanionMessage(ctx({ currentStreak: 3, happiness: 80, lastSessionDate: TODAY }));
      expect(msg).toContain('3');
    });

    it('returns streak message at 7-day milestone', () => {
      const msg = getCompanionMessage(ctx({ currentStreak: 7, happiness: 80, lastSessionDate: TODAY }));
      expect(msg).toContain('7');
    });

    it('does not return streak message at non-milestone streak', () => {
      const milestoneMsg = getCompanionMessage(ctx({ currentStreak: 7, happiness: 80, lastSessionDate: TODAY }));
      const nonMilestoneMsg = getCompanionMessage(ctx({ currentStreak: 5, happiness: 80, lastSessionDate: TODAY }));
      expect(nonMilestoneMsg).not.toBe(milestoneMsg);
    });
  });

  describe('priority 4: daily goal hit', () => {
    it('returns goal-complete message when sessions meet the goal', () => {
      const msg = getCompanionMessage(ctx({
        todaySessions: 4,
        dailySessionGoal: 4,
        happiness: 80,
        currentStreak: 1,
        lastSessionDate: TODAY,
      }));
      expect(msg).toMatch(/goal|crushed|complete|done/i);
    });

    it('returns goal-complete when sessions exceed the goal', () => {
      const msg = getCompanionMessage(ctx({
        todaySessions: 6,
        dailySessionGoal: 4,
        happiness: 80,
        currentStreak: 1,
        lastSessionDate: TODAY,
      }));
      expect(msg).toMatch(/goal|crushed|complete|done/i);
    });
  });

  describe('priority 5: one session away from goal', () => {
    it('returns one-away message when exactly 1 session from goal', () => {
      const msg = getCompanionMessage(ctx({
        todaySessions: 3,
        dailySessionGoal: 4,
        happiness: 80,
        currentStreak: 1,
        lastSessionDate: TODAY,
      }));
      expect(msg).toMatch(/one more|one session/i);
    });
  });

  describe('priority 6: has sessions today', () => {
    it('returns momentum message when sessions > 0 but not at goal', () => {
      const msg = getCompanionMessage(ctx({
        todaySessions: 2,
        dailySessionGoal: 4,
        happiness: 80,
        currentStreak: 1,
        lastSessionDate: TODAY,
      }));
      expect(msg).toMatch(/session|done|momentum|rhythm/i);
    });
  });

  describe('priority 7: time-of-day greetings', () => {
    it('returns morning greeting in the morning', () => {
      const msg = getCompanionMessage(ctx({ todaySessions: 0, lastSessionDate: YESTERDAY, hourOfDay: 9 }));
      expect(msg).toMatch(/morning/i);
    });

    it('returns afternoon greeting in the afternoon', () => {
      const msg = getCompanionMessage(ctx({ todaySessions: 0, lastSessionDate: YESTERDAY, hourOfDay: 14 }));
      expect(msg).toMatch(/afternoon/i);
    });

    it('returns evening greeting in the evening', () => {
      const msg = getCompanionMessage(ctx({ todaySessions: 0, lastSessionDate: YESTERDAY, hourOfDay: 20 }));
      expect(msg).toMatch(/evening/i);
    });
  });

  describe('stage voices', () => {
    it('returns different messages for different evolution stages', () => {
      const msgs = [1, 2, 3, 4, 5].map((stage) =>
        getCompanionMessage(ctx({ evolutionStage: stage as any, lastSessionDate: YESTERDAY, hourOfDay: 9, todaySessions: 0 }))
      );
      // At least some messages should differ across stages
      const unique = new Set(msgs);
      expect(unique.size).toBeGreaterThan(1);
    });
  });

  describe('return type', () => {
    it('always returns a non-empty string', () => {
      const scenarios: Partial<DialogueContext>[] = [
        {},
        { todaySessions: 0, lastSessionDate: null },
        { happiness: 10 },
        { currentStreak: 100 },
        { hourOfDay: 3 },
      ];
      scenarios.forEach((override) => {
        const msg = getCompanionMessage(ctx(override));
        expect(typeof msg).toBe('string');
        expect(msg.length).toBeGreaterThan(0);
      });
    });
  });
});
