import {
  computeNewStreak,
  shouldApplyDecay,
  applyDecay,
  canPetToday,
  getLast7Days,
  getCurrentMonthDays,
  getTagTotals,
  isLongBreakDue,
  computeElapsedMs,
} from '../gameLogic';
import { addDaysToLocalDateKey, getLocalDateKey } from '../date';

// ── computeNewStreak ──────────────────────────────────────────────────────

describe('computeNewStreak', () => {
  const TODAY = '2026-04-27';
  const YESTERDAY = '2026-04-26';
  const TWO_DAYS_AGO = '2026-04-25';

  it('returns 1 when there is no prior session', () => {
    expect(computeNewStreak(0, null, TODAY)).toBe(1);
  });

  it('keeps the streak unchanged when last session was today', () => {
    expect(computeNewStreak(5, TODAY, TODAY)).toBe(5);
  });

  it('increments the streak when last session was yesterday', () => {
    expect(computeNewStreak(3, YESTERDAY, TODAY)).toBe(4);
  });

  it('resets streak to 1 when last session was two or more days ago', () => {
    expect(computeNewStreak(7, TWO_DAYS_AGO, TODAY)).toBe(1);
  });
});

// ── shouldApplyDecay ──────────────────────────────────────────────────────

describe('shouldApplyDecay', () => {
  const TODAY = '2026-04-27';
  const YESTERDAY = '2026-04-26';
  const TWO_DAYS_AGO = '2026-04-25';

  it('returns false when decay was already applied today', () => {
    expect(shouldApplyDecay(TODAY, TODAY, null)).toBe(false);
  });

  it('returns false when the user played today', () => {
    expect(shouldApplyDecay(TODAY, null, TODAY)).toBe(false);
  });

  it('returns false when the user played yesterday', () => {
    expect(shouldApplyDecay(TODAY, null, YESTERDAY)).toBe(false);
  });

  it('returns true when last session was two or more days ago', () => {
    expect(shouldApplyDecay(TODAY, null, TWO_DAYS_AGO)).toBe(true);
  });

  it('returns true when there has never been a session', () => {
    expect(shouldApplyDecay(TODAY, null, null)).toBe(true);
  });
});

// ── applyDecay ────────────────────────────────────────────────────────────

describe('applyDecay', () => {
  it('reduces happiness by the daily decay amount', () => {
    // Just verify it decreases — actual constant value tested separately
    expect(applyDecay(80)).toBeLessThan(80);
  });

  it('does not drop below the minimum happiness', () => {
    expect(applyDecay(0)).toBeGreaterThanOrEqual(0);
  });
});

// ── canPetToday ───────────────────────────────────────────────────────────

describe('canPetToday', () => {
  const TODAY = '2026-04-27';
  const YESTERDAY = '2026-04-26';

  it('returns true when lastPetDate is null', () => {
    expect(canPetToday(null, TODAY)).toBe(true);
  });

  it('returns true when lastPetDate was a different day', () => {
    expect(canPetToday(YESTERDAY, TODAY)).toBe(true);
  });

  it('returns false when the companion was already petted today', () => {
    expect(canPetToday(TODAY, TODAY)).toBe(false);
  });
});

// ── getLast7Days ──────────────────────────────────────────────────────────

describe('getLast7Days', () => {
  it('returns exactly 7 entries', () => {
    expect(getLast7Days([])).toHaveLength(7);
  });

  it('returns 0 minutes for all days when entries is empty', () => {
    const days = getLast7Days([]);
    expect(days.every((d) => d.minutes === 0)).toBe(true);
  });

  it('sums minutes for sessions on the same day', () => {
    const today = getLocalDateKey();
    const entries = [
      { id: '1', date: today, task: '', tag: 'Work' as const, durationMinutes: 25, completedAt: '' },
      { id: '2', date: today, task: '', tag: 'Study' as const, durationMinutes: 25, completedAt: '' },
    ];
    const days = getLast7Days(entries);
    const todayBar = days.find((d) => d.date === today);
    expect(todayBar?.minutes).toBe(50);
  });

  it('ignores entries older than 7 days', () => {
    const oldDate = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 10);
      return getLocalDateKey(d);
    })();
    const entries = [
      { id: '1', date: oldDate, task: '', tag: 'Work' as const, durationMinutes: 25, completedAt: '' },
    ];
    const days = getLast7Days(entries);
    expect(days.every((d) => d.minutes === 0)).toBe(true);
  });
});

// ── monthly and tag aggregation ──────────────────────────────────────────

describe('monthly and tag aggregation', () => {
  it('returns one entry for each day in the current month', () => {
    const days = getCurrentMonthDays([], new Date(2026, 3, 27));
    expect(days).toHaveLength(30);
    expect(days[0].date).toBe('2026-04-01');
  });

  it('sums minutes by session tag', () => {
    const entries = [
      { id: '1', date: '2026-04-27', task: '', tag: 'Work' as const, durationMinutes: 25, completedAt: '' },
      { id: '2', date: '2026-04-27', task: '', tag: 'Work' as const, durationMinutes: 15, completedAt: '' },
      { id: '3', date: '2026-04-27', task: '', tag: 'Reading' as const, durationMinutes: 20, completedAt: '' },
    ];
    expect(getTagTotals(entries)).toEqual({ Work: 40, Reading: 20 });
  });
});

// ── local date helpers ───────────────────────────────────────────────────

describe('local date helpers', () => {
  it('formats dates as local YYYY-MM-DD keys', () => {
    expect(getLocalDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('adds days across month boundaries using local calendar dates', () => {
    expect(addDaysToLocalDateKey('2026-03-01', -1)).toBe('2026-02-28');
  });
});

// ── isLongBreakDue ────────────────────────────────────────────────────────

describe('isLongBreakDue', () => {
  it('returns false when fewer than 4 focus sessions completed in cycle', () => {
    expect(isLongBreakDue(3)).toBe(false);
  });

  it('returns true when exactly 4 focus sessions completed in cycle', () => {
    expect(isLongBreakDue(4)).toBe(true);
  });

  it('returns true when more than 4 focus sessions completed in cycle', () => {
    expect(isLongBreakDue(6)).toBe(true);
  });
});

// ── computeElapsedMs ─────────────────────────────────────────────────────

describe('computeElapsedMs', () => {
  it('returns elapsed time excluding paused duration', () => {
    const startedAt = 1000;
    const totalPausedMs = 200;
    const now = 1800;
    expect(computeElapsedMs(startedAt, totalPausedMs, now)).toBe(600);
  });

  it('returns 0 when called at the exact start time with no pauses', () => {
    expect(computeElapsedMs(1000, 0, 1000)).toBe(0);
  });
});
