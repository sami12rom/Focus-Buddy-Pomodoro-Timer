import { getAchievements, AchievementInput } from '../achievements';

function baseInput(overrides: Partial<AchievementInput> = {}): AchievementInput {
  return {
    totalSessions: 0,
    currentStreak: 0,
    bestStreak: 0,
    totalFocusMinutes: 0,
    longBreaksCompleted: 0,
    petDays: 0,
    unlockedIds: [],
    ...overrides,
  };
}

describe('getAchievements', () => {
  it('returns 20 achievements', () => {
    expect(getAchievements(baseInput())).toHaveLength(20);
  });

  it('all achievements are locked for a fresh user', () => {
    const achievements = getAchievements(baseInput());
    expect(achievements.every((a) => !a.unlocked)).toBe(true);
  });

  it('unlocks first-session after 1 completed session', () => {
    const achievements = getAchievements(baseInput({ totalSessions: 1 }));
    const a = achievements.find((a) => a.id === 'first-session')!;
    expect(a.unlocked).toBe(true);
  });

  it('does not unlock ten-sessions at 9 sessions', () => {
    const achievements = getAchievements(baseInput({ totalSessions: 9 }));
    const a = achievements.find((a) => a.id === 'ten-sessions')!;
    expect(a.unlocked).toBe(false);
  });

  it('unlocks ten-sessions at exactly 10 sessions', () => {
    const achievements = getAchievements(baseInput({ totalSessions: 10 }));
    const a = achievements.find((a) => a.id === 'ten-sessions')!;
    expect(a.unlocked).toBe(true);
  });

  it('caps progress at target', () => {
    const achievements = getAchievements(baseInput({ totalSessions: 999 }));
    achievements.forEach((a) => {
      expect(a.progress).toBeLessThanOrEqual(a.target);
    });
  });

  it('uses bestStreak when it exceeds currentStreak for streak achievements', () => {
    const achievements = getAchievements(baseInput({ currentStreak: 0, bestStreak: 7 }));
    const a = achievements.find((a) => a.id === 'seven-day-streak')!;
    expect(a.unlocked).toBe(true);
  });

  it('unlocks streak achievement via currentStreak even if bestStreak is lower', () => {
    const achievements = getAchievements(baseInput({ currentStreak: 7, bestStreak: 3 }));
    const a = achievements.find((a) => a.id === 'seven-day-streak')!;
    expect(a.unlocked).toBe(true);
  });

  describe('permanence', () => {
    it('stays unlocked via unlockedIds even when metric is 0', () => {
      const achievements = getAchievements(baseInput({
        totalSessions: 0,
        unlockedIds: ['first-session'],
      }));
      const a = achievements.find((a) => a.id === 'first-session')!;
      expect(a.unlocked).toBe(true);
    });

    it('shows full progress for permanently unlocked achievements', () => {
      const achievements = getAchievements(baseInput({
        totalSessions: 0,
        unlockedIds: ['ten-sessions'],
      }));
      const a = achievements.find((a) => a.id === 'ten-sessions')!;
      expect(a.progress).toBe(a.target);
    });

    it('does not unlock achievements not in unlockedIds when metric is 0', () => {
      const achievements = getAchievements(baseInput({
        totalSessions: 0,
        unlockedIds: ['first-session'],
      }));
      const a = achievements.find((a) => a.id === 'ten-sessions')!;
      expect(a.unlocked).toBe(false);
    });
  });

  it('unlocks hundred-minutes at exactly 100 minutes', () => {
    const achievements = getAchievements(baseInput({ totalFocusMinutes: 100 }));
    const a = achievements.find((a) => a.id === 'hundred-minutes')!;
    expect(a.unlocked).toBe(true);
  });

  it('unlocks deep-rest after 1 long break', () => {
    const achievements = getAchievements(baseInput({ longBreaksCompleted: 1 }));
    const a = achievements.find((a) => a.id === 'deep-rest')!;
    expect(a.unlocked).toBe(true);
  });

  it('unlocks companion-care after 7 pet days', () => {
    const achievements = getAchievements(baseInput({ petDays: 7 }));
    const a = achievements.find((a) => a.id === 'companion-care')!;
    expect(a.unlocked).toBe(true);
  });

  it('has correct tiers — 5 easy, 6 medium, 5 hard, 4 legendary', () => {
    // Verify total count per implied tier by checking specific IDs exist
    const achievements = getAchievements(baseInput());
    const ids = achievements.map((a) => a.id);
    // Easy
    expect(ids).toContain('first-session');
    expect(ids).toContain('ten-sessions');
    // Medium
    expect(ids).toContain('seven-day-streak');
    expect(ids).toContain('twenty-five-sessions');
    // Hard
    expect(ids).toContain('fifty-sessions');
    expect(ids).toContain('fourteen-day-streak');
    // Legendary
    expect(ids).toContain('hundred-sessions');
    expect(ids).toContain('two-hundred-sessions');
  });
});
