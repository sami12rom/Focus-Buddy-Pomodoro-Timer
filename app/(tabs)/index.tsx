import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCompanionStore, FocusRewardResult } from '../../store/companionStore';
import { useStatsStore } from '../../store/statsStore';
import { useSessionStore } from '../../store/sessionStore';
import { useSessionHistoryStore } from '../../store/sessionHistoryStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useTheme } from '../../hooks/useTheme';
import CompanionView from '../../components/CompanionView';
import MoodBadge from '../../components/MoodBadge';
import XPBar from '../../components/XPBar';
import SessionBanner from '../../components/SessionBanner';
import OnboardingModal from '../../components/OnboardingModal';
import RewardModal from '../../components/RewardModal';
import RecoveryModal, { RecoveryState } from '../../components/RecoveryModal';
import { EVOLUTION_STAGE_NAMES } from '../../constants/game';
import { APP_NAME } from '../../constants/app';
import { computeElapsedMs } from '../../utils/gameLogic';
import { getLocalDateKey } from '../../utils/date';

export default function HomeScreen() {
  const router = useRouter();
  const t = useTheme();
  const {
    name, level, xp, happiness, evolutionStage, isHydrated,
    hasCompletedOnboarding, completeOnboarding, petCompanion, applyDailyCareCheck,
    applyFocusReward,
  } = useCompanionStore();
  const { todaySessions, currentStreak, lastSessionDate, recordCompletedSession } = useStatsStore();
  const resetTodayIfNewDay = useStatsStore((s) => s.resetTodayIfNewDay);
  const { activeSessionSnapshot, reset: resetSession, resumeFromSnapshot, clearSnapshot } = useSessionStore();
  const { addEntry } = useSessionHistoryStore();
  const { hapticsEnabled } = useSettingsStore();

  const [petMessage, setPetMessage] = useState<string | null>(null);
  const [recoveryState, setRecoveryState] = useState<RecoveryState>(null);
  const [recoveryRewardResult, setRecoveryRewardResult] = useState<FocusRewardResult | null>(null);
  const [recoveryRewardTask, setRecoveryRewardTask] = useState('');
  const [showRecoveryReward, setShowRecoveryReward] = useState(false);

  // Only check recovery once per app launch, after store hydrates
  const recoveryCheckedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      resetTodayIfNewDay();
      // Notification permission is now requested at first session start (focus.tsx)
      const today = getLocalDateKey();
      applyDailyCareCheck(today, lastSessionDate);
    }, [lastSessionDate]) // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Check for a persisted session snapshot once hydration completes
  useEffect(() => {
    if (!isHydrated) return;
    if (recoveryCheckedRef.current) return;
    recoveryCheckedRef.current = true;

    const snap = activeSessionSnapshot;
    if (!snap) return;

    if (snap.status === 'paused') {
      // Session was paused — time is frozen, always offer resume
      setRecoveryState({ type: 'offer-resume', snapshot: snap });
      return;
    }

    // Session was running — check if it has already ended
    const elapsed = computeElapsedMs(snap.startedAt, snap.totalPausedMs);
    if (elapsed >= snap.durationMs) {
      if (snap.type === 'focus') {
        setRecoveryState({ type: 'ended-focus', snapshot: snap });
      } else {
        setRecoveryState({ type: 'ended-break', snapshot: snap });
      }
    } else {
      setRecoveryState({ type: 'offer-resume', snapshot: snap });
    }
  }, [isHydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleTapCompanion() {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handlePetCompanion() {
    if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const { happinessIncreased } = petCompanion();
    const msg = happinessIncreased ? '💛 +Happiness!' : '😊 Already petted today';
    setPetMessage(msg);
    setTimeout(() => setPetMessage(null), 2000);
  }

  // ── Recovery handlers ─────────────────────────────────────────────────────

  function handleRecoveryResume() {
    setRecoveryState(null);
    resumeFromSnapshot();
    router.push('/focus');
  }

  function handleMarkCompleted() {
    const snap = recoveryState?.snapshot;
    if (!snap) return;
    // Clear snapshot first to prevent duplicate reward on repeated calls
    clearSnapshot();
    setRecoveryState(null);

    const result = applyFocusReward();
    const durationMinutes = Math.round(snap.durationMs / 60_000);
    recordCompletedSession(durationMinutes);
    addEntry({
      date: getLocalDateKey(new Date(snap.createdAt)),
      task: snap.task,
      durationMinutes,
      completedAt: new Date().toISOString(),
    });
    setRecoveryRewardTask(snap.task);
    setRecoveryRewardResult(result);
    setShowRecoveryReward(true);
  }

  function handleRecoveryDiscard() {
    clearSnapshot();
    resetSession();
    setRecoveryState(null);
  }

  function handleRecoveryContinue() {
    clearSnapshot();
    resetSession();
    setRecoveryState(null);
  }

  function handleRecoveryFinish() {
    clearSnapshot();
    resetSession();
    setRecoveryState(null);
  }

  if (!isHydrated) {
    return (
      <View style={[styles.loading, { backgroundColor: t.bg }]}>
        <ActivityIndicator color={t.focusAccent} size="large" />
      </View>
    );
  }

  if (!hasCompletedOnboarding) {
    return <OnboardingModal onComplete={completeOnboarding} />;
  }

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: t.bg }]}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="light-content" backgroundColor={t.bg} />

      <SessionBanner />

      <View style={styles.header}>
        <Text style={[styles.appName, { color: t.textSecondary }]}>{APP_NAME}</Text>
      </View>

      <View style={styles.companionSection}>
        <CompanionView
          evolutionStage={evolutionStage}
          size={220}
          onTap={handleTapCompanion}
          onLongPress={handlePetCompanion}
        />
        {petMessage && (
          <Text style={[styles.petMessage, { color: t.xpGold }]}>{petMessage}</Text>
        )}
        <Text style={[styles.companionName, { color: t.textPrimary }]}>{name}</Text>
        <Text style={[styles.stageName, { color: t.focusAccent }]}>{EVOLUTION_STAGE_NAMES[evolutionStage]}</Text>
        <MoodBadge happiness={happiness} />
      </View>

      <View style={styles.xpSection}>
        <XPBar xp={xp} />
      </View>

      <View style={styles.statsRow}>
        <StatCard icon="💛" label="Happiness" value={`${happiness}%`}           color={t.happiness}   bg={t.surface} labelColor={t.textMuted} />
        <StatCard icon="⭐" label="Level"     value={String(level)}             color={t.focusAccent} bg={t.surface} labelColor={t.textMuted} />
      </View>

      <View style={styles.statsRow}>
        <StatCard icon="🎯" label="Today"  value={`${todaySessions} sessions`} color={t.today}  bg={t.surface} labelColor={t.textMuted} />
        <StatCard icon="🔥" label="Streak" value={`${currentStreak} days`}     color={t.streak} bg={t.surface} labelColor={t.textMuted} />
      </View>

      <TouchableOpacity
        style={[styles.startButton, { backgroundColor: t.focusAccent }]}
        onPress={() => router.push('/focus')}
        activeOpacity={0.85}
        accessibilityLabel="Start focus session"
        accessibilityRole="button"
      >
        <Text style={styles.startButtonText}>Start Focus Session</Text>
      </TouchableOpacity>

      {/* Session recovery prompt — shown once per launch when a snapshot is found */}
      <RecoveryModal
        state={recoveryState}
        onResume={handleRecoveryResume}
        onMarkCompleted={handleMarkCompleted}
        onDiscard={handleRecoveryDiscard}
        onContinue={handleRecoveryContinue}
        onFinishForNow={handleRecoveryFinish}
      />

      {/* Reward from mark-completed recovery */}
      <RewardModal
        visible={showRecoveryReward}
        result={recoveryRewardResult}
        task={recoveryRewardTask}
        onDismiss={() => {
          setShowRecoveryReward(false);
          setRecoveryRewardTask('');
        }}
      />
    </ScrollView>
  );
}

function StatCard({
  icon, label, value, color, bg, labelColor,
}: {
  icon: string; label: string; value: string;
  color: string; bg: string; labelColor: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statLabel, { color: labelColor }]}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 32,
    alignItems: 'center',
    gap: 20,
  },
  header: {
    width: '100%',
    alignItems: 'center',
  },
  appName: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  companionSection: {
    alignItems: 'center',
    gap: 8,
    marginVertical: 8,
  },
  petMessage: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: -4,
  },
  companionName: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 4,
  },
  stageName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  xpSection: {
    width: '100%',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'flex-start',
    gap: 4,
  },
  statIcon: {
    fontSize: 22,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  startButton: {
    borderRadius: 20,
    paddingVertical: 18,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
