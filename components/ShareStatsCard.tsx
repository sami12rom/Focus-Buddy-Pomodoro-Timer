import React, { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EVOLUTION_STAGE_NAMES } from '../constants/game';

const STAGE_EMOJI: Record<number, string> = {
  1: '🥚',
  2: '🐣',
  3: '🐥',
  4: '🐓',
  5: '🦅',
};

interface Props {
  name: string;
  evolutionStage: 1 | 2 | 3 | 4 | 5;
  level: number;
  currentStreak: number;
  bestStreak: number;
  totalSessions: number;
  totalFocusMinutes: number;
}

const ShareStatsCard = forwardRef<View, Props>(function ShareStatsCard(
  { name, evolutionStage, level, currentStreak, bestStreak, totalSessions, totalFocusMinutes },
  ref
) {
  const hours = Math.floor(totalFocusMinutes / 60);
  const mins = totalFocusMinutes % 60;
  const focusTime = hours > 0 ? `${hours}h ${mins}m` : `${totalFocusMinutes}m`;
  const stageName = EVOLUTION_STAGE_NAMES[evolutionStage];

  return (
    <View ref={ref} style={styles.card} collapsable={false}>
      {/* Top accent bar */}
      <View style={styles.accentBar} />

      {/* Branding */}
      <Text style={styles.appLabel}>FOCUS BUDDY</Text>

      {/* Companion */}
      <View style={styles.companionRow}>
        <Text style={styles.stageEmoji}>{STAGE_EMOJI[evolutionStage]}</Text>
        <View style={styles.companionInfo}>
          <Text style={styles.companionName}>{name}</Text>
          <View style={styles.stagePill}>
            <Text style={styles.stageLabel}>{stageName}</Text>
          </View>
        </View>
        <View style={styles.levelBadge}>
          <Text style={styles.levelNumber}>{level}</Text>
          <Text style={styles.levelLabel}>LVL</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        <StatTile emoji="🔥" label="Current Streak" value={`${currentStreak} days`} accent="#f97316" />
        <StatTile emoji="✅" label="Total Sessions" value={String(totalSessions)}    accent="#7c3aed" />
        <StatTile emoji="⏱️" label="Focus Time"     value={focusTime}               accent="#0ea5e9" />
        <StatTile emoji="🏆" label="Best Streak"    value={`${bestStreak} days`}     accent="#eab308" />
      </View>

      {/* Footer */}
      <Text style={styles.footer}>Focus. Level up. Every day.</Text>
    </View>
  );
});

function StatTile({
  emoji, label, value, accent,
}: {
  emoji: string; label: string; value: string; accent: string;
}) {
  return (
    <View style={[styles.tile, { borderTopColor: accent }]}>
      <Text style={styles.tileEmoji}>{emoji}</Text>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

export default ShareStatsCard;

const styles = StyleSheet.create({
  card: {
    width: 320,
    backgroundColor: '#0f0f1a',
    borderRadius: 24,
    overflow: 'hidden',
    paddingBottom: 24,
  },
  accentBar: {
    height: 4,
    backgroundColor: '#7c3aed',
  },
  appLabel: {
    color: '#7c3aed',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.5,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  companionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  stageEmoji: {
    fontSize: 48,
  },
  companionInfo: {
    flex: 1,
    gap: 6,
  },
  companionName: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  stagePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#7c3aed22',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#7c3aed55',
  },
  stageLabel: {
    color: '#a78bfa',
    fontSize: 12,
    fontWeight: '600',
  },
  levelBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumber: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  levelLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#ffffff14',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 20,
  },
  tile: {
    width: '47%',
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    padding: 14,
    borderTopWidth: 2,
    gap: 4,
  },
  tileEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  tileValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  tileLabel: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '500',
  },
  footer: {
    color: '#4b5563',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
