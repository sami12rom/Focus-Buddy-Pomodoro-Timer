import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getMood, MOOD_EMOJI, MOOD_LABEL, Mood } from '../utils/mood';
import { useTheme } from '../hooks/useTheme';
import { AppTheme } from '../constants/colors';

interface Props {
  happiness: number;
}

function moodColor(mood: Mood, t: AppTheme): string {
  if (mood === 'happy') return t.moodHappy;
  if (mood === 'neutral') return t.moodNeutral;
  return t.moodTired;
}

export default function MoodBadge({ happiness }: Props) {
  const t = useTheme();
  const mood = getMood(happiness);
  const color = moodColor(mood, t);

  return (
    <View style={[styles.badge, { backgroundColor: color + '33', borderColor: color }]}>
      <Text style={styles.emoji}>{MOOD_EMOJI[mood]}</Text>
      <Text style={[styles.label, { color }]}>{MOOD_LABEL[mood]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  emoji: {
    fontSize: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
});
