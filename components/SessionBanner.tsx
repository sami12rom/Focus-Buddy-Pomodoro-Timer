import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSessionStore } from '../store/sessionStore';
import { useTheme } from '../hooks/useTheme';

export default function SessionBanner() {
  const router = useRouter();
  const t = useTheme();
  const {
    status, startTime, pausedAt, totalPausedMs, activeDurationMs,
    selectedFocusMinutes, selectedBreakMinutes, selectedLongBreakMinutes,
    isCurrentBreakLong, currentTask,
  } = useSessionStore();

  const isFocus   = status === 'running'       || status === 'paused';
  const isBreak   = status === 'break_running' || status === 'break_paused';
  const isRunning = status === 'running'       || status === 'break_running';
  const isPaused  = status === 'paused'        || status === 'break_paused';
  const isActive  = isFocus || isBreak;

  const fallbackDurationMs = isFocus
    ? selectedFocusMinutes * 60_000
    : (isCurrentBreakLong ? selectedLongBreakMinutes : selectedBreakMinutes) * 60_000;
  const durationMs = activeDurationMs ?? fallbackDurationMs;

  const [remainingMs, setRemainingMs] = useState(durationMs);

  useEffect(() => {
    if (!isActive) return;

    function tick() {
      if (!startTime) { setRemainingMs(durationMs); return; }
      const now     = isPaused ? (pausedAt ?? Date.now()) : Date.now();
      const elapsed = now - startTime - totalPausedMs;
      setRemainingMs(Math.max(0, durationMs - elapsed));
    }

    tick();
    if (!isRunning) return;
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [status, startTime, totalPausedMs, pausedAt, durationMs]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isActive) return null;

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const mm = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const ss = (totalSeconds % 60).toString().padStart(2, '0');

  const accent = isFocus ? t.focusAccent : t.breakAccent;
  const label  = isFocus ? 'Focus' : 'Break';

  return (
    <TouchableOpacity
      style={[styles.banner, { backgroundColor: t.surface }]}
      onPress={() => router.push('/focus')}
      activeOpacity={0.85}
    >
      <View style={[styles.accentBar, { backgroundColor: accent }]} />

      <View style={styles.content}>
        <Text style={[styles.label, { color: accent }]}>{label}</Text>
        <Text style={[styles.dot, { color: t.textMuted }]}>•</Text>
        <Text style={[styles.time, { color: t.textPrimary }]}>{mm}:{ss}</Text>
        {currentTask.length > 0 && (
          <>
            <Text style={[styles.dot, { color: t.textMuted }]}>•</Text>
            <Text style={[styles.task, { color: t.textMuted }]} numberOfLines={1}>
              {currentTask}
            </Text>
          </>
        )}
        {isPaused && (
          <Text style={[styles.pausedTag, { color: t.xpGold }]}>paused</Text>
        )}
      </View>

      <Text style={[styles.arrow, { color: accent }]}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    overflow: 'hidden',
    width: '100%',
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 8,
    flexWrap: 'nowrap',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  dot: {
    fontSize: 12,
  },
  time: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  task: {
    flex: 1,
    fontSize: 13,
  },
  pausedTag: {
    fontSize: 11,
    fontWeight: '600',
  },
  arrow: {
    fontSize: 24,
    fontWeight: '400',
    paddingRight: 14,
    marginTop: -2,
  },
});
