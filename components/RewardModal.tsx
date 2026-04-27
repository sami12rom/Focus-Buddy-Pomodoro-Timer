import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FocusRewardResult } from '../store/companionStore';
import { EVOLUTION_STAGE_NAMES } from '../constants/game';
import { useTheme } from '../hooks/useTheme';

interface Props {
  visible: boolean;
  result: FocusRewardResult | null;
  task?: string;
  onDismiss: () => void;
}

export default function RewardModal({ visible, result, task, onDismiss }: Props) {
  const t = useTheme();
  if (!result) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: t.surface }]}>
          {result.evolved ? (
            <>
              <Text style={[styles.evolveTitle, { color: t.xpGold }]}>✨ Evolution!</Text>
              <Text style={[styles.subtitle, { color: t.textPrimary }]}>
                Your companion became a {EVOLUTION_STAGE_NAMES[result.newStage]}!
              </Text>
            </>
          ) : result.leveledUp ? (
            <>
              <Text style={[styles.mainTitle, { color: t.focusAccent }]}>⬆️ Level Up!</Text>
              <Text style={[styles.subtitle, { color: t.textSecondary }]}>Now level {result.newLevel}</Text>
            </>
          ) : (
            <Text style={[styles.mainTitle, { color: t.textPrimary }]}>🎉 Session Complete!</Text>
          )}

          {task ? (
            <Text style={[styles.taskLine, { color: t.textMuted }]}>
              You completed: <Text style={{ color: t.textPrimary, fontWeight: '600' }}>{task}</Text>
            </Text>
          ) : null}

          <View style={styles.rewards}>
            <RewardRow icon="⚡" label="XP"        value={`+${result.xpGained}`}        color={t.focusAccent} bg={t.surfaceRaised} labelColor={t.textSecondary} />
            <RewardRow icon="💛" label="Happiness" value={`+${result.happinessGained}`} color={t.xpGold}      bg={t.surfaceRaised} labelColor={t.textSecondary} />
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: t.focusAccent }]}
            onPress={onDismiss}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Continue →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function RewardRow({
  icon, label, value, color, bg, labelColor,
}: {
  icon: string; label: string; value: string;
  color: string; bg: string; labelColor: string;
}) {
  return (
    <View style={[styles.rewardRow, { backgroundColor: bg }]}>
      <Text style={styles.rewardIcon}>{icon}</Text>
      <Text style={[styles.rewardLabel, { color: labelColor }]}>{label}</Text>
      <Text style={[styles.rewardValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 24,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    gap: 20,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
  },
  evolveTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginTop: -12,
    textAlign: 'center',
  },
  taskLine: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: -8,
  },
  rewards: {
    width: '100%',
    gap: 12,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    padding: 14,
  },
  rewardIcon: {
    fontSize: 20,
  },
  rewardLabel: {
    flex: 1,
    fontSize: 15,
  },
  rewardValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  button: {
    borderRadius: 16,
    paddingHorizontal: 40,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
});
