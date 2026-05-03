import { getMood } from '../mood';
import { MOOD_HAPPY_THRESHOLD, MOOD_NEUTRAL_THRESHOLD } from '../../constants/game';

// MOOD_HAPPY_THRESHOLD = 70, MOOD_NEUTRAL_THRESHOLD = 40

describe('getMood', () => {
  it('returns happy at exactly the happy threshold', () => {
    expect(getMood(MOOD_HAPPY_THRESHOLD)).toBe('happy');
  });

  it('returns happy above the happy threshold', () => {
    expect(getMood(100)).toBe('happy');
    expect(getMood(80)).toBe('happy');
  });

  it('returns neutral between the two thresholds', () => {
    expect(getMood(MOOD_NEUTRAL_THRESHOLD)).toBe('neutral');
    expect(getMood(50)).toBe('neutral');
    expect(getMood(MOOD_HAPPY_THRESHOLD - 1)).toBe('neutral');
  });

  it('returns tired below the neutral threshold', () => {
    expect(getMood(MOOD_NEUTRAL_THRESHOLD - 1)).toBe('tired');
    expect(getMood(0)).toBe('tired');
  });
});
