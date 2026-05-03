import { getLocalDateKey, addDaysToLocalDateKey, getDaysInMonth } from '../date';

describe('getLocalDateKey', () => {
  it('formats a known date correctly', () => {
    expect(getLocalDateKey(new Date(2025, 0, 5))).toBe('2025-01-05');
  });

  it('zero-pads single digit months and days', () => {
    expect(getLocalDateKey(new Date(2025, 2, 3))).toBe('2025-03-03');
  });

  it('handles end-of-year dates', () => {
    expect(getLocalDateKey(new Date(2025, 11, 31))).toBe('2025-12-31');
  });

  it('returns a string matching YYYY-MM-DD pattern', () => {
    const key = getLocalDateKey(new Date());
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('addDaysToLocalDateKey', () => {
  it('adds positive days correctly', () => {
    expect(addDaysToLocalDateKey('2025-01-30', 2)).toBe('2025-02-01');
  });

  it('subtracts negative days correctly', () => {
    expect(addDaysToLocalDateKey('2025-03-01', -1)).toBe('2025-02-28');
  });

  it('handles adding 0 days', () => {
    expect(addDaysToLocalDateKey('2025-06-15', 0)).toBe('2025-06-15');
  });

  it('crosses year boundary correctly', () => {
    expect(addDaysToLocalDateKey('2025-12-31', 1)).toBe('2026-01-01');
  });

  it('handles leap year Feb 28 + 1 day', () => {
    expect(addDaysToLocalDateKey('2024-02-28', 1)).toBe('2024-02-29');
  });

  it('handles non-leap year Feb 28 + 1 day', () => {
    expect(addDaysToLocalDateKey('2025-02-28', 1)).toBe('2025-03-01');
  });
});

describe('getDaysInMonth', () => {
  it('returns 31 for January', () => {
    expect(getDaysInMonth(2025, 0)).toBe(31);
  });

  it('returns 28 for February in non-leap year', () => {
    expect(getDaysInMonth(2025, 1)).toBe(28);
  });

  it('returns 29 for February in leap year', () => {
    expect(getDaysInMonth(2024, 1)).toBe(29);
  });

  it('returns 30 for April', () => {
    expect(getDaysInMonth(2025, 3)).toBe(30);
  });

  it('returns 31 for December', () => {
    expect(getDaysInMonth(2025, 11)).toBe(31);
  });
});
