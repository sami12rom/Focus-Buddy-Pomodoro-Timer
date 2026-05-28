import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Animated,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCompanionStore, FocusRewardResult } from '../../store/companionStore';
import { useStatsStore } from '../../store/statsStore';
import { useSessionStore, ActiveSessionSnapshot } from '../../store/sessionStore';
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
import { getTodayFocusMinutes, goalProgress } from '../../utils/sessionStats';
import { withAlpha } from '../../utils/color';
import { DEFAULT_SESSION_TAG } from '../../constants/sessionTags';
import { useGoalStore } from '../../store/goalStore';
import { useSocialStore } from '../../store/socialStore';
import { getCompanionMessage } from '../../utils/companionDialogue';
import { subscribeToFocusingCount, fetchFocusingCount } from '../../utils/activeSessionSync';

export default function HomeScreen() {
  const router = useRouter();
  const t = useTheme();
  const {
    name, level, xp, happiness, evolutionStage, isHydrated,
    hasCompletedOnboarding, completeOnboarding, petCompanion,
    applyFocusReward, pendingEvolution, clearPendingEvolution,
  } = useCompanionStore();
  const {
    todaySessions,
    currentStreak,
    lastSessionDate,
    recordCompletedSession,
    recordLongBreakCompleted,
  } = useStatsStore();
  const resetTodayIfNewDay = useStatsStore((s) => s.resetTodayIfNewDay);
  const { activeSessionSnapshot, reset: resetSession, resumeFromSnapshot, clearSnapshot } = useSessionStore();
  const { entries, addEntry, updateEntryOutcome } = useSessionHistoryStore();
  const recoveryEntryIdRef = useRef<string | null>(null);
  const { hapticsEnabled } = useSettingsStore();
  const { dailySessionGoal, dailyMinuteGoal, setDailySessionGoal } = useGoalStore();
  const { focusingCount, setFocusingCount } = useSocialStore();

  useEffect(() => {
    return subscribeToFocusingCount(setFocusingCount);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch count every time home tab comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchFocusingCount().then(setFocusingCount);
    }, [setFocusingCount])
  );

  const [petMessage, setPetMessage] = useState<string | null>(null);
  const [dialogueMessage, setDialogueMessage] = useState('');
  const bubbleOpacity = useRef(new Animated.Value(0)).current;
  const [recoveryState, setRecoveryState] = useState<RecoveryState>(null);
  const [recoveryRewardResult, setRecoveryRewardResult] = useState<FocusRewardResult | null>(null);
  const [recoveryRewardTask, setRecoveryRewardTask] = useState('');
  const [showRecoveryReward, setShowRecoveryReward] = useState(false);
  const [isHomeFocused, setIsHomeFocused] = useState(false);
  const today = getLocalDateKey();
  const todayFocusMinutes = getTodayFocusMinutes(entries, today);
  const sessionGoalProgress = goalProgress(todaySessions, dailySessionGoal);
  const minuteGoalProgress = goalProgress(todayFocusMinutes, dailyMinuteGoal);

  // Only check recovery once per app launch, after store hydrates
  const recoveryCheckedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      setIsHomeFocused(true);
      return () => setIsHomeFocused(false);
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      resetTodayIfNewDay();
      setDialogueMessage(
        getCompanionMessage({
          name,
          evolutionStage,
          happiness,
          currentStreak,
          todaySessions,
          dailySessionGoal,
          lastSessionDate,
          hourOfDay: new Date().getHours(),
        }),
      );
    }, [name, evolutionStage, happiness, currentStreak, todaySessions, dailySessionGoal, lastSessionDate]) // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Fade in the bubble each time the message updates
  useEffect(() => {
    if (!dialogueMessage) return;
    bubbleOpacity.setValue(0);
    Animated.timing(bubbleOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [dialogueMessage]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Recovery helpers ──────────────────────────────────────────────────────

  function maybeRecordLongBreak(snap: ActiveSessionSnapshot | undefined) {
    if (snap?.type === 'break' && snap.isLongBreak) recordLongBreakCompleted();
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
    recoveryEntryIdRef.current = addEntry({
      date: getLocalDateKey(new Date(snap.createdAt)),
      task: snap.task,
      tag: snap.tag ?? DEFAULT_SESSION_TAG,
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
    maybeRecordLongBreak(recoveryState?.snapshot);
    clearSnapshot();
    resetSession();
    setRecoveryState(null);
  }

  function handleRecoveryFinish() {
    maybeRecordLongBreak(recoveryState?.snapshot);
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
    return (
      <OnboardingModal
        onComplete={(name, sessionGoal) => {
          completeOnboarding(name);
          setDailySessionGoal(sessionGoal);
        }}
      />
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={t.bg} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <SessionBanner />

        <View style={styles.header}>
          <Text style={[styles.appName, { color: t.textSecondary }]}>{APP_NAME}</Text>
        </View>

        <View style={styles.companionSection}>
          {dialogueMessage && !petMessage && (
            <Animated.View style={[styles.speechBubbleWrap, { opacity: bubbleOpacity }]}>
              <View style={[styles.speechBubble, { backgroundColor: t.surface }]}>
                <Text style={[styles.speechBubbleText, { color: t.textSecondary }]}>{dialogueMessage}</Text>
              </View>
              <View style={[styles.speechBubbleTail, { borderTopColor: t.surface }]} />
            </Animated.View>
          )}
          <CompanionView
            evolutionStage={evolutionStage}
            evolutionTransition={isHomeFocused ? pendingEvolution : null}
            onEvolutionTransitionComplete={clearPendingEvolution}
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

        {focusingCount > 0 && (
          <Text style={[styles.focusingCount, { color: t.textMuted }]}>
            🌍 {focusingCount} {focusingCount === 1 ? 'person' : 'people'} focusing right now
          </Text>
        )}

        <View style={styles.statsRow}>
          <StatCard icon="💛" label="Happiness" value={`${happiness}%`}           color={t.happiness}   bg={t.surface} labelColor={t.textMuted} />
          <StatCard icon="⭐" label="Level"     value={String(level)}             color={t.focusAccent} bg={t.surface} labelColor={t.textMuted} />
        </View>

        <View style={styles.statsRow}>
          <StatCard icon="🎯" label="Today"  value={`${todaySessions} sessions`} color={t.today}  bg={t.surface} labelColor={t.textMuted} />
          <StatCard icon="🔥" label="Streak" value={`${currentStreak} days`}     color={t.streak} bg={t.surface} labelColor={t.textMuted} />
        </View>

        <View style={[styles.goalCard, { backgroundColor: t.surface }]}>
          <Text style={[styles.goalTitle, { color: t.textPrimary }]}>Daily Goals</Text>
          <GoalRow
            label="Sessions"
            value={`${todaySessions}/${dailySessionGoal}`}
            progress={sessionGoalProgress}
            accent={t.today}
            muted={t.textMuted}
            text={t.textSecondary}
            track={t.surfaceRaised}
          />
          <GoalRow
            label="Focus minutes"
            value={`${todayFocusMinutes}/${dailyMinuteGoal}m`}
            progress={minuteGoalProgress}
            accent={t.focusAccent}
            muted={t.textMuted}
            text={t.textSecondary}
            track={t.surfaceRaised}
          />
        </View>
      </ScrollView>

      {/* Floating start button — always visible above the tab bar */}
      <View style={[styles.floatingBar, { backgroundColor: withAlpha(t.bg, 0.8), borderTopColor: t.border }]}>
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: t.focusAccent }]}
          onPress={() => router.push('/focus')}
          activeOpacity={0.85}
          accessibilityLabel="Start focus session"
          accessibilityRole="button"
        >
          <Text style={styles.startButtonText}>Start Focus Session</Text>
        </TouchableOpacity>
      </View>

      <RecoveryModal
        state={recoveryState}
        onResume={handleRecoveryResume}
        onMarkCompleted={handleMarkCompleted}
        onDiscard={handleRecoveryDiscard}
        onContinue={handleRecoveryContinue}
        onFinishForNow={handleRecoveryFinish}
      />

      <RewardModal
        visible={showRecoveryReward}
        result={recoveryRewardResult}
        task={recoveryRewardTask}
        onDismiss={() => {
          setShowRecoveryReward(false);
          setRecoveryRewardTask('');
        }}
        onGoalOutcome={(outcome) => {
          if (recoveryEntryIdRef.current) updateEntryOutcome(recoveryEntryIdRef.current, outcome);
        }}
      />
    </View>
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

function GoalRow({
  label, value, progress, accent, muted, text, track,
}: {
  label: string;
  value: string;
  progress: number;
  accent: string;
  muted: string;
  text: string;
  track: string;
}) {
  return (
    <View style={styles.goalRow}>
      <View style={styles.goalHeader}>
        <Text style={[styles.goalLabel, { color: text }]}>{label}</Text>
        <Text style={[styles.goalValue, { color: muted }]}>{value}</Text>
      </View>
      <View style={[styles.goalTrack, { backgroundColor: track }]}>
        <View style={[styles.goalFill, { width: `${progress * 100}%`, backgroundColor: accent }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  floatingBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
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
  speechBubbleWrap: {
    alignItems: 'center',
  },
  speechBubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '82%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  speechBubbleTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  speechBubbleText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
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
  focusingCount: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
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
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  goalCard: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  goalRow: {
    gap: 6,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  goalLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  goalValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  goalTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalFill: {
    height: '100%',
    borderRadius: 4,
  },
});
