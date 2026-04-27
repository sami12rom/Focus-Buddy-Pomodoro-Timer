import { MOOD_HAPPY_THRESHOLD, MOOD_NEUTRAL_THRESHOLD } from '../constants/game';

export type Mood = 'happy' | 'neutral' | 'tired';

export function getMood(happiness: number): Mood {
  if (happiness >= MOOD_HAPPY_THRESHOLD) return 'happy';
  if (happiness >= MOOD_NEUTRAL_THRESHOLD) return 'neutral';
  return 'tired';
}

export const MOOD_EMOJI: Record<Mood, string> = {
  happy: '😊',
  neutral: '😐',
  tired: '😴',
};

export const MOOD_LABEL: Record<Mood, string> = {
  happy: 'Happy',
  neutral: 'Neutral',
  tired: 'Tired',
};

