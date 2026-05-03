import {
  computeNewStreak,
  shouldApplyDecay,
  applyDecay,
  canPetToday,
  getTagTotals,
  isLongBreakDue,
  computeElapsedMs,
  getLast7Days,
} from '../gameLogic';
import { DAILY_HAPPINESS_DECAY, HAPPINESS_MIN, FOCUS_SESSIONS_BEFORE_LONG_BREAK } from '../../constants/game';
import { getLocalDateKey } from '../date';
import type { SessionTag } from '../../constants/sessionTags';

const TODAY = '2025-06-15';
const YESTERDAY = '2025-06-14';
const TWO_DAYS_AGO = '2025-06-13';
const THREE_DAYS_AGO = '2025-06-12';

// ── computeNewStreak ──────────────────────────────────────────────────────

describe('computeNewStreak', () => {
  it('returns 1 when there is no previous session', () => {
    expect(computeNewStreak(0, null, TODAY)).toBe(1);
  });

  it('keeps the same streak when last session was today', () => {
    expect(computeNewStreak(5, TODAY, TODAY)).toBe(5);
  });

  it('increments streak when last session was yesterday', () => {
    expect(computeNewStreak(3, YESTERDAY, TODAY)).toBe(4);
  });

  it('increments streak on the grace period (2 days ago)', () => {
    expect(computeNewStreak(3, TWO_DAYS_AGO, TODAY)).toBe(4);
  });

  it('resets to 1 when last session was 3+ days ago', () => {
    expect(computeNewStreak(7, THREE_DAYS_AGO, TODAY)).toBe(1);
  });

  it('resets to 1 when last session was long ago', () => {
    expect(computeNewStreak(30, '2025-01-01', TODAY)).toBe(1);
  });
});

// ── shouldApplyDecay ──────────────────────────────────────────────────────

describe('shouldApplyDecay', () => {
  it('does not decay if already decayed today', () => {
    expect(shouldApplyDecay(TODAY, TODAY, null)).toBe(false);
  });

  it('does not decay if there was a session today', () => {
    expect(shouldApplyDecay(TODAY, YESTERDAY, TODAY)).toBe(false);
  });

  it('does not decay if last session was yesterday', () => {
    expect(shouldApplyDecay(TODAY, null, YESTERDAY)).toBe(false);
  });

  it('decays when no session today or yesterday and not yet decayed today', () => {
    expect(shouldApplyDecay(TODAY, YESTERDAY, TWO_DAYS_AGO)).toBe(true);
  });

  it('decays when no session history at all', () => {
    expect(shouldApplyDecay(TODAY, null, null)).toBe(true);
  });
});

// ── applyDecay ────────────────────────────────────────────────────────────

describe('applyDecay', () => {
  it('reduces happiness by DAILY_HAPPINESS_DECAY', () => {
    expect(applyDecay(80)).toBe(80 - DAILY_HAPPINESS_DECAY);
  });

  it('does not go below HAPPINESS_MIN', () => {
    expect(applyDecay(HAPPINESS_MIN)).toBe(HAPPINESS_MIN);
    expect(applyDecay(HAPPINESS_MIN + 1)).toBe(HAPPINESS_MIN);
    expect(applyDecay(1)).toBe(HAPPINESS_MIN);
  });

  it('applies the full decay when well above the floor', () => {
    expect(applyDecay(HAPPINESS_MIN + DAILY_HAPPINESS_DECAY + 10)).toBe(HAPPINESS_MIN + 10);
  });
});

// ── canPetToday ───────────────────────────────────────────────────────────

describe('canPetToday', () => {
  it('allows petting when lastPetDate is null', () => {
    expect(canPetToday(null, TODAY)).toBe(true);
  });

  it('allows petting when last pet was yesterday', () => {
    expect(canPetToday(YESTERDAY, TODAY)).toBe(true);
  });

  it('prevents petting when already petted today', () => {
    expect(canPetToday(TODAY, TODAY)).toBe(false);
  });
});

// ── isLongBreakDue ────────────────────────────────────────────────────────

describe('isLongBreakDue', () => {
  it('returns false when below the threshold', () => {
    expect(isLongBreakDue(FOCUS_SESSIONS_BEFORE_LONG_BREAK - 1)).toBe(false);
  });

  it('returns true at exactly the threshold', () => {
    expect(isLongBreakDue(FOCUS_SESSIONS_BEFORE_LONG_BREAK)).toBe(true);
  });

  it('returns true above the threshold', () => {
    expect(isLongBreakDue(FOCUS_SESSIONS_BEFORE_LONG_BREAK + 1)).toBe(true);
  });
});

// ── computeElapsedMs ─────────────────────────────────────────────────────

describe('computeElapsedMs', () => {
  it('returns elapsed time with no pauses', () => {
    expect(computeElapsedMs(1000, 0, 6000)).toBe(5000);
  });

  it('subtracts paused time from elapsed', () => {
    expect(computeElapsedMs(1000, 3000, 11000)).toBe(7000);
  });

  it('returns 0 when paused for the full duration', () => {
    expect(computeElapsedMs(1000, 5000, 6000)).toBe(0);
  });
});

// ── getTagTotals ─────────────────────────────────────────────────────────

describe('getTagTotals', () => {
  it('returns empty object for no entries', () => {
    expect(getTagTotals([])).toEqual({});
  });

  it('sums minutes per tag', () => {
    const entries = [
      { id: '1', date: TODAY, tag: 'Work' as SessionTag,  durationMinutes: 25, completedAt: '', task: '' },
      { id: '2', date: TODAY, tag: 'Work' as SessionTag,  durationMinutes: 30, completedAt: '', task: '' },
      { id: '3', date: TODAY, tag: 'Study' as SessionTag, durationMinutes: 45, completedAt: '', task: '' },
    ];
    expect(getTagTotals(entries)).toEqual({ Work: 55, Study: 45 });
  });

  it('falls back to Work when tag is null', () => {
    const entries = [
      { id: '1', date: TODAY, tag: null as any, durationMinutes: 20, completedAt: '', task: '' },
    ];
    expect(getTagTotals(entries)).toEqual({ Work: 20 });
  });
});

// ── getLast7Days ─────────────────────────────────────────────────────────

describe('getLast7Days', () => {
  it('always returns exactly 7 entries', () => {
    expect(getLast7Days([])).toHaveLength(7);
  });

  it('returns 0 minutes for days with no sessions', () => {
    const result = getLast7Days([]);
    expect(result.every((d) => d.minutes === 0)).toBe(true);
  });

  it('correctly accumulates minutes for matching date', () => {
    const todayKey = getLocalDateKey();
    const entries = [
      { id: '1', date: todayKey, tag: 'Work' as SessionTag, durationMinutes: 25, completedAt: '', task: '' },
      { id: '2', date: todayKey, tag: 'Work' as SessionTag, durationMinutes: 25, completedAt: '', task: '' },
    ];
    const result = getLast7Days(entries);
    const todayBar = result.find((d) => d.date === todayKey);
    expect(todayBar?.minutes).toBe(50);
  });

  it('last entry is today', () => {
    const result = getLast7Days([]);
    expect(result[result.length - 1].date).toBe(getLocalDateKey());
  });
});
