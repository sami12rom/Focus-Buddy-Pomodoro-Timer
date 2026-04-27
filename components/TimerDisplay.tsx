import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface Props {
  remainingMs: number;
  style?: object;
}

export default function TimerDisplay({ remainingMs, style }: Props) {
  const t = useTheme();
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');

  return (
    <Text style={[styles.timer, { color: t.textPrimary }, style]}>
      {minutes}:{seconds}
    </Text>
  );
}

const styles = StyleSheet.create({
  timer: {
    fontSize: 72,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 4,
  },
});
