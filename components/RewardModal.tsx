import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { FocusRewardResult } from '../store/companionStore';
import { GoalOutcome } from '../store/sessionHistoryStore';
import { EVOLUTION_STAGE_NAMES } from '../constants/game';
import { useTheme } from '../hooks/useTheme';

interface Props {
  visible: boolean;
  result: FocusRewardResult | null;
  task?: string;
  onDismiss: () => void;
  onGoalOutcome?: (outcome: GoalOutcome) => void;
  autoStartCountdown?: number;
}

export default function RewardModal({ visible, result, task, onDismiss, onGoalOutcome, autoStartCountdown }: Props) {
  const t = useTheme();
  if (!result) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View entering={FadeInDown.duration(400).springify()} style={[styles.card, { backgroundColor: t.surface }]}>
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

          <View style={styles.rewards}>
            <RewardRow icon="⚡" label="XP"        value={`+${result.xpGained}`}        color={t.focusAccent} bg={t.surfaceRaised} labelColor={t.textSecondary} />
            <RewardRow icon="💛" label="Happiness" value={`+${result.happinessGained}`} color={t.xpGold}      bg={t.surfaceRaised} labelColor={t.textSecondary} />
          </View>

          {autoStartCountdown !== undefined && (
            <Text style={[styles.countdownHint, { color: t.textMuted }]}>
              Break starts in {autoStartCountdown}s
            </Text>
          )}

          {task && onGoalOutcome ? (
            <>
              <Text style={[styles.goalQuestion, { color: t.textMuted }]}>
                Did you finish:{' '}
                <Text style={{ color: t.textPrimary, fontWeight: '600' }}>{task}</Text>
              </Text>
              <View style={styles.outcomeRow}>
                {(['done', 'partial', 'no'] as GoalOutcome[]).map((outcome) => (
                  <TouchableOpacity
                    key={outcome}
                    style={[styles.outcomeButton, { borderColor: t.focusAccent + '55', backgroundColor: t.surfaceRaised }]}
                    onPress={() => { onGoalOutcome(outcome); onDismiss(); }}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.outcomeIcon, {
                      color: outcome === 'done' ? '#4ADE80' : outcome === 'partial' ? t.xpGold : t.textMuted,
                    }]}>
                      {outcome === 'done' ? '✓' : outcome === 'partial' ? '~' : '✗'}
                    </Text>
                    <Text style={[styles.outcomeLabel, { color: t.textSecondary }]}>
                      {outcome === 'done' ? 'Done' : outcome === 'partial' ? 'Partial' : 'No'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: t.focusAccent }]}
              onPress={onDismiss}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                {autoStartCountdown !== undefined ? 'Start Now' : 'Continue →'}
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
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
  goalQuestion: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: -8,
  },
  outcomeRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  outcomeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  outcomeIcon: {
    fontSize: 18,
    fontWeight: '700',
  },
  outcomeLabel: {
    fontSize: 13,
    fontWeight: '500',
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
  countdownHint: {
    fontSize: 13,
    marginBottom: -8,
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
