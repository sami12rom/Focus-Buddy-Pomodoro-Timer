import { computeInsights } from '../insights';
import type { SessionHistoryEntry } from '../../store/sessionHistoryStore';

function makeEntry(overrides: Partial<SessionHistoryEntry> & { date: string }): SessionHistoryEntry {
  return {
    id: Math.random().toString(),
    task: '',
    tag: 'Work',
    durationMinutes: 25,
    completedAt: new Date(`${overrides.date}T10:00:00`).toISOString(),
    ...overrides,
  };
}

describe('computeInsights', () => {
  it('returns empty array for fewer than 3 entries', () => {
    expect(computeInsights([])).toEqual([]);
    expect(computeInsights([makeEntry({ date: '2025-01-01' })])).toEqual([]);
    expect(computeInsights([
      makeEntry({ date: '2025-01-01' }),
      makeEntry({ date: '2025-01-02' }),
    ])).toEqual([]);
  });

  it('returns insights for 3 or more entries', () => {
    const entries = [
      makeEntry({ date: '2025-01-06' }), // Monday
      makeEntry({ date: '2025-01-07' }), // Tuesday
      makeEntry({ date: '2025-01-08' }), // Wednesday
    ];
    const insights = computeInsights(entries);
    expect(insights.length).toBeGreaterThan(0);
  });

  it('includes most productive day insight', () => {
    const entries = [
      makeEntry({ date: '2025-01-06', durationMinutes: 50 }), // Monday
      makeEntry({ date: '2025-01-07', durationMinutes: 25 }), // Tuesday
      makeEntry({ date: '2025-01-08', durationMinutes: 25 }), // Wednesday
    ];
    const insights = computeInsights(entries);
    const dayInsight = insights.find((i) => i.label === 'Most productive day');
    expect(dayInsight).toBeDefined();
    expect(dayInsight!.value).toBe('Monday');
  });

  it('includes peak focus time insight', () => {
    const entries = [
      makeEntry({ date: '2025-01-06', completedAt: '2025-01-06T09:00:00.000Z' }),
      makeEntry({ date: '2025-01-07', completedAt: '2025-01-07T09:00:00.000Z' }),
      makeEntry({ date: '2025-01-08', completedAt: '2025-01-08T14:00:00.000Z' }),
    ];
    const insights = computeInsights(entries);
    const peakInsight = insights.find((i) => i.label === 'Peak focus time');
    expect(peakInsight).toBeDefined();
  });

  it('includes consistency insight', () => {
    const entries = [
      makeEntry({ date: '2025-01-06' }),
      makeEntry({ date: '2025-01-07' }),
      makeEntry({ date: '2025-01-08' }),
    ];
    const insights = computeInsights(entries);
    const consistencyInsight = insights.find((i) => i.label === 'Consistency (14 days)');
    expect(consistencyInsight).toBeDefined();
    expect(consistencyInsight!.value).toMatch(/%$/);
  });

  it('includes average session length insight', () => {
    const entries = [
      makeEntry({ date: '2025-01-06', durationMinutes: 25 }),
      makeEntry({ date: '2025-01-07', durationMinutes: 25 }),
      makeEntry({ date: '2025-01-08', durationMinutes: 25 }),
    ];
    const insights = computeInsights(entries);
    const avgInsight = insights.find((i) => i.label === 'Avg session length');
    expect(avgInsight).toBeDefined();
    expect(avgInsight!.value).toBe('25 min');
  });

  it('includes weekday vs weekend insight when both exist', () => {
    const entries = [
      makeEntry({ date: '2025-01-06' }), // Monday (weekday)
      makeEntry({ date: '2025-01-07' }), // Tuesday (weekday)
      makeEntry({ date: '2025-01-11' }), // Saturday (weekend)
      makeEntry({ date: '2025-01-12' }), // Sunday (weekend)
    ];
    const insights = computeInsights(entries);
    const wkInsight = insights.find((i) => i.label === 'Weekday vs weekend');
    expect(wkInsight).toBeDefined();
  });

  it('omits weekday vs weekend when no weekend entries exist', () => {
    const entries = [
      makeEntry({ date: '2025-01-06' }), // Monday
      makeEntry({ date: '2025-01-07' }), // Tuesday
      makeEntry({ date: '2025-01-08' }), // Wednesday
    ];
    const insights = computeInsights(entries);
    const wkInsight = insights.find((i) => i.label === 'Weekday vs weekend');
    expect(wkInsight).toBeUndefined();
  });
});
