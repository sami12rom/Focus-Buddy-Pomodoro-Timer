import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  BackHandler,
  StatusBar,
  KeyboardAvoidingView,
  Modal,
  ScrollView,
  Platform,
  useWindowDimensions,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as ScreenOrientation from 'expo-screen-orientation';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useSessionStore } from '../store/sessionStore';
import { useCompanionStore, FocusRewardResult } from '../store/companionStore';
import { useStatsStore } from '../store/statsStore';
import { useSessionHistoryStore } from '../store/sessionHistoryStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTimer } from '../hooks/useTimer';
import { useAmbientSound } from '../hooks/useAmbientSound';
import { useTheme } from '../hooks/useTheme';
import { getSessionTheme } from '../constants/colors';
import { getLocalDateKey } from '../utils/date';
import { DEFAULT_SESSION_TAG, SESSION_TAGS } from '../constants/sessionTags';
import type { SessionTag } from '../constants/sessionTags';
import { AMBIENT_SOUNDS } from '../constants/sounds';
import { withAlpha } from '../utils/color';
import TimerDisplay from '../components/TimerDisplay';
import CompanionView from '../components/CompanionView';
import CircularTimer from '../components/CircularTimer';
import RewardModal from '../components/RewardModal';
import BreakEndModal from '../components/BreakEndModal';
import BreathingAnimation from '../components/BreathingAnimation';
import {
  scheduleSessionEndNotification,
  cancelScheduledNotification,
  fireCompletionAlarm,
  fireAchievementNotification,
} from '../utils/notifications';
import {
  startTimerNotification,
  updateTimerNotification,
  stopTimerNotification,
} from '../utils/timerNotification';
import { syncSessionStart, syncSessionEnd } from '../utils/activeSessionSync';
import { getAchievements } from '../utils/achievements';
import * as Haptics from 'expo-haptics';
import * as StoreReview from 'expo-store-review';

const TASK_PLACEHOLDERS: Record<SessionTag, string> = {
  Work: 'Reply to client feedback',
  Study: 'Review biology notes',
  Reading: 'Read one chapter',
  Chores: 'Tidy the kitchen',
  'Deep Work': 'Draft the launch plan',
};

const FOCUS_MINUTES_MIN = 1;
const FOCUS_MINUTES_MAX = 120;
const BREAK_MINUTES_MIN = 1;
const BREAK_MINUTES_MAX = 30;
const FOCUS_EXTENSION_PROMPT_MS = 60_000;

export default function TimerScreen() {
  const router = useRouter();
  const t = useTheme();
  const insets = useSafeAreaInsets();

  const {
    status, reset,
    startFocus, pauseFocus, resumeFocus,
    startBreak, pauseBreak, resumeBreak,
    interactDuringBreak, breakInteracted,
    selectedFocusMinutes, selectedBreakMinutes, activeDurationMs, currentTag,
    setFocusMinutes, setBreakMinutes, setCurrentTask, setCurrentTag, extendFocusByMinutes,
    isCurrentBreakLong,
    incrementCycle, resetCycle, clearSnapshot,
  } = useSessionStore();

  const { evolutionStage, applyFocusReward, applyBreakInteraction } = useCompanionStore();
  const { todaySessions, recordCompletedSession, recordLongBreakCompleted, markAchievementsNotified } = useStatsStore();
  const { addEntry, updateEntryOutcome } = useSessionHistoryStore();
  const { soundEnabled, hapticsEnabled, keepAwakeEnabled, autoStartBreak, ambientSounds, toggleAmbientSound } = useSettingsStore();

  const [taskInput, setTaskInput] = useState('');
  const [rewardResult, setRewardResult] = useState<FocusRewardResult | null>(null);
  const [showReward, setShowReward] = useState(false);
  const [showBreakEnd, setShowBreakEnd] = useState(false);
  const [breakWasSkipped, setBreakWasSkipped] = useState(false);
  const [autoStartCountdown, setAutoStartCountdown] = useState<number | undefined>(undefined);
  const [showFocusExtensionPrompt, setShowFocusExtensionPrompt] = useState(false);
  const [showSoundPickerModal, setShowSoundPickerModal] = useState(false);
  const [breakPetAnimationTrigger, setBreakPetAnimationTrigger] = useState(0);
  const rewardDismissedRef = useRef(false);
  const extensionPromptShownRef = useRef(false);
  const lastEntryIdRef = useRef<string | null>(null);

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const focusSessionTheme = getSessionTheme(t, 'focus');
  const breakSessionTheme = getSessionTheme(t, 'break');

  const PRESETS = [
    { focus: 25, break: 5 },
    { focus: 45, break: 10 },
    { focus: 90, break: 20 },
  ];

  const isIdle = status === 'idle';
  const isFocusRunning = status === 'running' || status === 'paused';
  const isBreakRunning = status === 'break_running' || status === 'break_paused';

  useAmbientSound({ isRunning: status === 'running' || status === 'break_running', isBreak: isBreakRunning });

  const shouldKeepAwake = keepAwakeEnabled && (status === 'running' || status === 'break_running');

  useEffect(() => {
    function syncKeepAwake() {
      if (shouldKeepAwake) {
        void activateKeepAwakeAsync();
      } else {
        deactivateKeepAwake();
      }
    }

    syncKeepAwake();
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') syncKeepAwake();
    });

    return () => {
      sub.remove();
      if (shouldKeepAwake) deactivateKeepAwake();
    };
  }, [shouldKeepAwake]);

  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.unlockAsync();
      if (isBreakRunning) reset();
      return () => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      };
    }, []) // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── Focus timer ──────────────────────────────────────────────────────────
  const handleFocusComplete = useCallback(() => {
    setShowFocusExtensionPrompt(false);
    setShowSoundPickerModal(false);
    extensionPromptShownRef.current = false;
    deactivateKeepAwake();
    cancelScheduledNotification();
    void stopTimerNotification();
    void syncSessionEnd();
    if (soundEnabled) fireCompletionAlarm('focus');
    if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Increment cycle BEFORE reading it in startBreak
    incrementCycle();

    const result = applyFocusReward();

    // Record stats with actual duration
    const completedDurationMinutes = Math.max(
      1,
      Math.round((useSessionStore.getState().activeDurationMs ?? selectedFocusMinutes * 60_000) / 60_000)
    );
    recordCompletedSession(completedDurationMinutes);

    // Add session history entry
    const today = getLocalDateKey();
    lastEntryIdRef.current = addEntry({
      date: today,
      task: taskInput,
      tag: currentTag,
      durationMinutes: completedDurationMinutes,
      completedAt: new Date().toISOString(),
    });
    clearSnapshot();

    // Check for newly unlocked achievements
    const updatedStats = useStatsStore.getState();
    const { petDates } = useCompanionStore.getState();
    const allAchievements = getAchievements({
      totalSessions: updatedStats.totalSessions,
      currentStreak: updatedStats.currentStreak,
      bestStreak: updatedStats.bestStreak,
      totalFocusMinutes: updatedStats.totalFocusMinutes,
      longBreaksCompleted: updatedStats.longBreaksCompleted,
      petDays: petDates.length,
      unlockedIds: updatedStats.unlockedAchievements,
    });
    const newlyUnlocked = allAchievements.filter(
      (a) => a.unlocked && !updatedStats.unlockedAchievements.includes(a.id)
    );
    if (newlyUnlocked.length > 0) {
      newlyUnlocked.forEach((a) => fireAchievementNotification(a.title, a.description));
      markAchievementsNotified(newlyUnlocked.map((a) => a.id));
    }

    // Ask for a review after the 5th session — OS rate-limits subsequent calls automatically
    if (updatedStats.totalSessions === 5) {
      StoreReview.isAvailableAsync().then((available) => {
        if (available) StoreReview.requestReview();
      });
    }

    rewardDismissedRef.current = false;
    setRewardResult(result);
    setShowReward(true);
  }, [applyFocusReward, recordCompletedSession, addEntry, markAchievementsNotified,
      soundEnabled, hapticsEnabled, selectedFocusMinutes, taskInput, currentTag,
      incrementCycle, clearSnapshot]);

  const focusTimer = useTimer('focus', handleFocusComplete);

  useEffect(() => {
    if (status !== 'running') return;
    if (focusTimer.remainingMs <= 0) return;

    if (focusTimer.remainingMs <= FOCUS_EXTENSION_PROMPT_MS && !extensionPromptShownRef.current) {
      extensionPromptShownRef.current = true;
      setShowFocusExtensionPrompt(true);
    }
  }, [status, focusTimer.remainingMs]);

  // ── Break timer ───────────────────────────────────────────────────────────
  const handleBreakComplete = useCallback(() => {
    deactivateKeepAwake();
    cancelScheduledNotification();
    void stopTimerNotification();
    if (soundEnabled) fireCompletionAlarm('break');
    if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (isCurrentBreakLong) {
      recordLongBreakCompleted();
      resetCycle();
    }
    setBreakWasSkipped(false);
    setShowBreakEnd(true);
    // reset() is deferred until user makes a choice in BreakEndModal
  }, [soundEnabled, hapticsEnabled, isCurrentBreakLong, recordLongBreakCompleted, resetCycle]);

  const breakTimer = useTimer('break', handleBreakComplete);

  // ── Android back button ───────────────────────────────────────────────────
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isIdle) {
        router.back();
      } else if (isFocusRunning) {
        handleCancelFocus();
      } else if (isBreakRunning) {
        handleSkipBreak();
      }
      return true;
    });
    return () => sub.remove();
  }, [isIdle, isFocusRunning, isBreakRunning]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Setup actions ─────────────────────────────────────────────────────────
  function handleStart() {
    extensionPromptShownRef.current = false;
    setShowFocusExtensionPrompt(false);
    setCurrentTask(taskInput);
    startFocus();
    if (keepAwakeEnabled) activateKeepAwakeAsync();
    scheduleSessionEndNotification(selectedFocusMinutes * 60_000, 'focus');
    void syncSessionStart();
    const s = useSessionStore.getState();
    void startTimerNotification({
      status: 'running',
      startTime: s.startTime!,
      activeDurationMs: s.activeDurationMs!,
      totalPausedMs: s.totalPausedMs,
      pausedAt: null,
      task: taskInput,
      sessionType: 'focus',
    });
  }

  function handleStartBreak() {
    setCurrentTask(taskInput);
    // isManual=true → always short break regardless of cycle count
    const breakDurationMs = startBreak(true);
    if (keepAwakeEnabled) activateKeepAwakeAsync();
    scheduleSessionEndNotification(breakDurationMs, 'break');
    const s = useSessionStore.getState();
    void startTimerNotification({
      status: 'running',
      startTime: s.startTime!,
      activeDurationMs: breakDurationMs,
      totalPausedMs: 0,
      pausedAt: null,
      task: '',
      sessionType: 'break',
    });
  }

  function adjustFocusMinutes(delta: number) {
    setFocusMinutes(Math.max(FOCUS_MINUTES_MIN, Math.min(FOCUS_MINUTES_MAX, selectedFocusMinutes + delta)));
  }

  function adjustBreakMinutes(delta: number) {
    setBreakMinutes(Math.max(BREAK_MINUTES_MIN, Math.min(BREAK_MINUTES_MAX, selectedBreakMinutes + delta)));
  }

  // ── Focus running actions ─────────────────────────────────────────────────
  function handlePauseFocus() {
    pauseFocus();
    cancelScheduledNotification();
    const s = useSessionStore.getState();
    void updateTimerNotification({
      status: 'paused',
      startTime: s.startTime!,
      activeDurationMs: s.activeDurationMs!,
      totalPausedMs: s.totalPausedMs,
      pausedAt: s.pausedAt,
      task: taskInput,
      sessionType: 'focus',
    });
  }

  function handleResumeFocus() {
    resumeFocus();
    scheduleSessionEndNotification(focusTimer.remainingMs, 'focus');
    const s = useSessionStore.getState();
    void updateTimerNotification({
      status: 'running',
      startTime: s.startTime!,
      activeDurationMs: s.activeDurationMs!,
      totalPausedMs: s.totalPausedMs,
      pausedAt: null,
      task: taskInput,
      sessionType: 'focus',
    });
  }

  function handleCancelFocus() {
    deactivateKeepAwake();
    cancelScheduledNotification();
    setShowFocusExtensionPrompt(false);
    setShowSoundPickerModal(false);
    extensionPromptShownRef.current = false;
    reset();
    clearSnapshot();
    void stopTimerNotification();
    void syncSessionEnd();
  }

  function handleExtendFocus(minutes: number) {
    setShowFocusExtensionPrompt(false);
    extensionPromptShownRef.current = false;
    extendFocusByMinutes(minutes);
    scheduleSessionEndNotification(focusTimer.remainingMs + minutes * 60_000, 'focus');
  }

  function handleRewardDismiss() {
    if (rewardDismissedRef.current) return;
    rewardDismissedRef.current = true;
    setShowReward(false);
    setAutoStartCountdown(undefined);
    const breakDurationMs = startBreak();
    if (keepAwakeEnabled) activateKeepAwakeAsync();
    scheduleSessionEndNotification(breakDurationMs, 'break');
    const s = useSessionStore.getState();
    void startTimerNotification({
      status: 'running',
      startTime: s.startTime!,
      activeDurationMs: breakDurationMs,
      totalPausedMs: 0,
      pausedAt: null,
      task: '',
      sessionType: 'break',
    });
  }

  // Auto-start break countdown when reward modal is shown
  useEffect(() => {
    if (!showReward || !autoStartBreak) return;
    const DELAY = 5;
    setAutoStartCountdown(DELAY);
    let count = DELAY;
    const interval = setInterval(() => {
      count -= 1;
      setAutoStartCountdown(count > 0 ? count : undefined);
      if (count <= 0) clearInterval(interval);
    }, 1000);
    const timer = setTimeout(() => handleRewardDismiss(), DELAY * 1000);
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [showReward]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Break running actions ─────────────────────────────────────────────────
  function handlePauseBreak() {
    pauseBreak();
    cancelScheduledNotification();
    const s = useSessionStore.getState();
    void updateTimerNotification({
      status: 'paused',
      startTime: s.startTime!,
      activeDurationMs: s.activeDurationMs!,
      totalPausedMs: s.totalPausedMs,
      pausedAt: s.pausedAt,
      task: '',
      sessionType: 'break',
    });
  }

  function handleResumeBreak() {
    resumeBreak();
    scheduleSessionEndNotification(breakTimer.remainingMs, 'break');
    const s = useSessionStore.getState();
    void updateTimerNotification({
      status: 'running',
      startTime: s.startTime!,
      activeDurationMs: s.activeDurationMs!,
      totalPausedMs: s.totalPausedMs,
      pausedAt: null,
      task: '',
      sessionType: 'break',
    });
  }

  function handlePetCompanion() {
    if (breakInteracted) return;
    interactDuringBreak();
    applyBreakInteraction();
  }

  function handlePetButtonPress() {
    handlePetCompanion();
    setBreakPetAnimationTrigger((currentTrigger) => currentTrigger + 1);
  }

  function handleSkipBreak() {
    deactivateKeepAwake();
    cancelScheduledNotification();
    if (isCurrentBreakLong) resetCycle();
    setBreakWasSkipped(true);
    setShowBreakEnd(true);
    // reset() deferred to BreakEndModal choice
  }

  // ── BreakEndModal handlers ────────────────────────────────────────────────
  function handleBreakEndContinue() {
    setShowBreakEnd(false);
    reset();
    setTaskInput('');
    setCurrentTag(DEFAULT_SESSION_TAG);
    clearSnapshot();
    // Stay on this screen in idle state → user enters next task and starts
  }

  function handleBreakEndFinish() {
    setShowBreakEnd(false);
    reset();
    setTaskInput('');
    setCurrentTag(DEFAULT_SESSION_TAG);
    clearSnapshot();
    router.replace('/(tabs)');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Setup phase
  // ─────────────────────────────────────────────────────────────────────────
  if (isIdle) {
    const setupActionButtons = (
      <View style={[styles.setupActionRow, isLandscape && styles.setupActionRowLandscape]}>
        <TouchableOpacity style={[styles.startBtn, isLandscape && styles.startBtnLandscape, { backgroundColor: focusSessionTheme.accent }]} onPress={handleStart} activeOpacity={0.85} accessibilityLabel="Start focus session" accessibilityRole="button">
          <Text style={[styles.startBtnText, isLandscape && styles.startBtnTextLandscape]}>Start Focus</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.startBreakBtn, isLandscape && styles.startBreakBtnLandscape, { borderColor: breakSessionTheme.accent }]} onPress={handleStartBreak} activeOpacity={0.85} accessibilityLabel="Take a break" accessibilityRole="button">
          <Text style={[styles.startBreakBtnText, isLandscape && styles.startBreakBtnTextLandscape, { color: breakSessionTheme.accent }]}>Take Break</Text>
        </TouchableOpacity>
      </View>
    );

    const durationBlock = (
      <>
        {/* Quick presets */}
        <View style={[styles.presetsRow, isLandscape && styles.presetsRowLandscape]}>
          {PRESETS.map((p) => {
            const isActive = selectedFocusMinutes === p.focus && selectedBreakMinutes === p.break;
            return (
              <TouchableOpacity
                key={`${p.focus}/${p.break}`}
                style={[styles.presetChip, isLandscape && styles.presetChipLandscape, { backgroundColor: isActive ? focusSessionTheme.accent : t.surface, borderColor: isActive ? focusSessionTheme.accent : t.border }]}
                onPress={() => { setFocusMinutes(p.focus); setBreakMinutes(p.break); }}
                activeOpacity={0.8}
                accessibilityLabel={`${p.focus} minute focus, ${p.break} minute break preset`}
                accessibilityRole="button"
              >
                <Text style={[styles.presetText, isLandscape && styles.presetTextLandscape, { color: isActive ? '#fff' : t.textSecondary }]}>{p.focus}/{p.break}</Text>
                <Text style={[styles.presetUnit, isLandscape && styles.presetUnitLandscape, { color: isActive ? 'rgba(255,255,255,0.7)' : t.textMuted }]}>min</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Duration controls */}
        <View style={[styles.durationList, isLandscape && styles.durationListLandscape]}>
          <View style={[styles.durationControl, isLandscape && styles.durationControlLandscape, { backgroundColor: t.surface, borderColor: t.border }]}>
            <View style={styles.durationTextBlock}>
              <Text style={[styles.durationLabel, isLandscape && styles.durationLabelLandscape, { color: focusSessionTheme.accent }]}>Focus</Text>
              <Text style={[styles.durationValue, isLandscape && styles.durationValueLandscape, { color: t.textPrimary }]}>{selectedFocusMinutes} min</Text>
            </View>
            <View style={[styles.stepper, isLandscape && styles.stepperLandscape]}>
              <TouchableOpacity
                style={[styles.stepperBtn, isLandscape && styles.stepperBtnLandscape, { borderColor: focusSessionTheme.accent }, selectedFocusMinutes <= FOCUS_MINUTES_MIN && styles.stepperBtnDisabled]}
                onPress={() => adjustFocusMinutes(-5)}
                disabled={selectedFocusMinutes <= FOCUS_MINUTES_MIN}
                activeOpacity={0.75}
                accessibilityLabel="Decrease focus duration by 5 minutes"
                accessibilityRole="button"
              >
                <Ionicons name="remove" size={isLandscape ? 18 : 22} color={focusSessionTheme.accent} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.stepperBtn, isLandscape && styles.stepperBtnLandscape, { borderColor: focusSessionTheme.accent }, selectedFocusMinutes >= FOCUS_MINUTES_MAX && styles.stepperBtnDisabled]}
                onPress={() => adjustFocusMinutes(5)}
                disabled={selectedFocusMinutes >= FOCUS_MINUTES_MAX}
                activeOpacity={0.75}
                accessibilityLabel="Increase focus duration by 5 minutes"
                accessibilityRole="button"
              >
                <Ionicons name="add" size={isLandscape ? 18 : 22} color={focusSessionTheme.accent} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.durationControl, isLandscape && styles.durationControlLandscape, { backgroundColor: t.surface, borderColor: t.border }]}>
            <View style={styles.durationTextBlock}>
              <Text style={[styles.durationLabel, isLandscape && styles.durationLabelLandscape, { color: breakSessionTheme.accent }]}>Break</Text>
              <Text style={[styles.durationValue, isLandscape && styles.durationValueLandscape, { color: t.textPrimary }]}>{selectedBreakMinutes} min</Text>
            </View>
            <View style={[styles.stepper, isLandscape && styles.stepperLandscape]}>
              <TouchableOpacity
                style={[styles.stepperBtn, isLandscape && styles.stepperBtnLandscape, { borderColor: breakSessionTheme.accent }, selectedBreakMinutes <= BREAK_MINUTES_MIN && styles.stepperBtnDisabled]}
                onPress={() => adjustBreakMinutes(-1)}
                disabled={selectedBreakMinutes <= BREAK_MINUTES_MIN}
                activeOpacity={0.75}
                accessibilityLabel="Decrease break duration by 1 minute"
                accessibilityRole="button"
              >
                <Ionicons name="remove" size={isLandscape ? 18 : 22} color={breakSessionTheme.accent} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.stepperBtn, isLandscape && styles.stepperBtnLandscape, { borderColor: breakSessionTheme.accent }, selectedBreakMinutes >= BREAK_MINUTES_MAX && styles.stepperBtnDisabled]}
                onPress={() => adjustBreakMinutes(1)}
                disabled={selectedBreakMinutes >= BREAK_MINUTES_MAX}
                activeOpacity={0.75}
                accessibilityLabel="Increase break duration by 1 minute"
                accessibilityRole="button"
              >
                <Ionicons name="add" size={isLandscape ? 18 : 22} color={breakSessionTheme.accent} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </>
    );

    const intentionBlock = (
      <>
        <View style={[styles.intentionPrompt, isLandscape && styles.intentionPromptLandscape]}>
          <CompanionView evolutionStage={evolutionStage} size={isLandscape ? 82 : 116} />
          <View style={[styles.speechBubble, isLandscape && styles.speechBubbleLandscape, { backgroundColor: t.surface, borderColor: focusSessionTheme.accent + '55' }]}>
            <Text style={[styles.speechText, isLandscape && styles.speechTextLandscape, { color: t.textPrimary }]}>What are you working on?</Text>
            <View style={[styles.speechTail, { borderRightColor: t.surface }]} />
          </View>
        </View>

        <View style={[styles.taskCard, isLandscape && styles.taskCardLandscape, { backgroundColor: t.surface, borderColor: focusSessionTheme.accent + '66' }]}>
          <Text style={[styles.taskLabel, isLandscape && styles.taskLabelLandscape, { color: focusSessionTheme.accent }]}>Today's focus</Text>
          <TextInput
            style={[styles.taskInput, isLandscape && styles.taskInputLandscape, { color: t.textPrimary }]}
            placeholder={TASK_PLACEHOLDERS[currentTag]}
            placeholderTextColor={t.textMuted}
            value={taskInput}
            onChangeText={setTaskInput}
            returnKeyType="done"
            autoCorrect
            spellCheck
            autoCapitalize="sentences"
            textContentType="none"
            maxLength={80}
            accessibilityLabel="What are you working on?"
          />
        </View>

        <View style={[styles.tagRow, isLandscape && styles.tagRowLandscape]}>
          {SESSION_TAGS.map((tag) => {
            const active = currentTag === tag;
            return (
              <TouchableOpacity
                key={tag}
                style={[styles.tagChip, isLandscape && styles.tagChipLandscape, { backgroundColor: active ? focusSessionTheme.accent : t.surface, borderColor: active ? focusSessionTheme.accent : t.border }]}
                onPress={() => setCurrentTag(tag)}
                activeOpacity={0.8}
                accessibilityLabel={`${tag} session tag`}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.tagChipText, isLandscape && styles.tagChipTextLandscape, { color: active ? '#fff' : t.textSecondary }]}>{tag}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sessionCount, isLandscape && styles.sessionCountLandscape, { color: t.textMuted }]}>Session #{todaySessions + 1}</Text>
      </>
    );

    return (
      <KeyboardAvoidingView style={[styles.screen, { backgroundColor: t.focusBg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.ScrollView entering={FadeIn.duration(350)} style={styles.scrollScreen} contentContainerStyle={isLandscape ? styles.setupContentLandscape : styles.setupContent} scrollEnabled={!isLandscape} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <StatusBar barStyle="light-content" backgroundColor={t.focusBg} />
          <TouchableOpacity style={[styles.closeBtn, isLandscape && styles.closeBtnLandscape]} onPress={() => router.back()} hitSlop={12} accessibilityLabel="Close" accessibilityRole="button">
            <Text style={[styles.closeBtnText, { color: t.textMuted }]}>✕</Text>
          </TouchableOpacity>

          {isLandscape ? (
            <View style={styles.landscapeSetupColumns}>
              <View style={styles.landscapeCol}>{intentionBlock}</View>
              <View style={[styles.landscapeCol, styles.landscapeColRight]}>
                {durationBlock}
                {taskInput.trim().length > 0 && (
                  <Text style={[styles.startIntentLine, styles.startIntentLineLandscape, { color: t.textMuted }]} numberOfLines={1}>
                    Focusing on: <Text style={{ color: t.textPrimary, fontWeight: '700' }}>{taskInput.trim()}</Text>
                  </Text>
                )}
                {setupActionButtons}
              </View>
            </View>
          ) : (
            <>
              {intentionBlock}
              {durationBlock}
            </>
          )}
        </Animated.ScrollView>

        {!isLandscape && (
          <View style={[styles.setupFloatingBar, { backgroundColor: withAlpha(t.focusBg, 0.92), borderTopColor: t.border, paddingBottom: Math.max(24, insets.bottom + 8) }]}>
            {taskInput.trim().length > 0 && (
              <Text style={[styles.startIntentLine, { color: t.textMuted }]} numberOfLines={1}>
                Focusing on: <Text style={{ color: t.textPrimary, fontWeight: '700' }}>{taskInput.trim()}</Text>
              </Text>
            )}
            {setupActionButtons}
          </View>
        )}
      </KeyboardAvoidingView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Focus running phase
  // ─────────────────────────────────────────────────────────────────────────
  const soundPicker = (
    <View style={styles.soundPickerContainer}>
      <Text style={[styles.soundPickerLabel, { color: t.textMuted }]}>Sounds</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.soundPickerContent}>
        {AMBIENT_SOUNDS.map((s) => {
          const active = s.id === 'none' ? ambientSounds.length === 0 : ambientSounds.includes(s.id);
          return (
            <TouchableOpacity
              key={s.id}
              style={[styles.soundChip, { backgroundColor: active ? focusSessionTheme.accent : t.surface, borderColor: active ? focusSessionTheme.accent : t.border }]}
              onPress={() => toggleAmbientSound(s.id)}
              activeOpacity={0.8}
              accessibilityLabel={`${s.label} ambient sound`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={styles.soundChipIcon}>{s.icon}</Text>
              <Text style={[styles.soundChipLabel, { color: active ? '#fff' : t.textSecondary }]}>{s.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
  const selectedSoundSummary = ambientSounds.length === 0
    ? 'None'
    : ambientSounds
        .map((id) => AMBIENT_SOUNDS.find((s) => s.id === id)?.label)
        .filter(Boolean)
        .join(' + ');
  const soundPickerModal = (
    <Modal
      visible={showSoundPickerModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowSoundPickerModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.soundModal, { backgroundColor: t.surface, borderColor: t.border }]}>
          <View style={styles.soundModalHeader}>
            <Text style={[styles.soundModalTitle, { color: t.textPrimary }]}>Sounds</Text>
            <TouchableOpacity onPress={() => setShowSoundPickerModal(false)} hitSlop={10} accessibilityLabel="Close sound picker" accessibilityRole="button">
              <Ionicons name="close" size={20} color={t.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={styles.soundModalGrid}>
            {AMBIENT_SOUNDS.map((s) => {
              const active = s.id === 'none' ? ambientSounds.length === 0 : ambientSounds.includes(s.id);
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.soundModalChip, { backgroundColor: active ? focusSessionTheme.accent : t.focusBg, borderColor: active ? focusSessionTheme.accent : t.border }]}
                  onPress={() => toggleAmbientSound(s.id)}
                  activeOpacity={0.8}
                  accessibilityLabel={`${s.label} ambient sound`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={styles.soundChipIcon}>{s.icon}</Text>
                  <Text style={[styles.soundModalChipText, { color: active ? '#fff' : t.textSecondary }]}>{s.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
  const landscapeSoundControl = (
    <TouchableOpacity
      style={[styles.landscapeSoundControl, { backgroundColor: t.surface, borderColor: t.border }]}
      onPress={() => setShowSoundPickerModal(true)}
      activeOpacity={0.82}
      accessibilityLabel={`Change ambient sounds. Current sounds: ${selectedSoundSummary}`}
      accessibilityRole="button"
    >
      <View style={styles.landscapeSoundText}>
        <Text style={[styles.soundPickerLabel, styles.landscapeSoundLabel, { color: t.textMuted }]}>Sounds</Text>
        <Text style={[styles.landscapeSoundValue, { color: t.textPrimary }]} numberOfLines={1}>{selectedSoundSummary}</Text>
      </View>
      <Ionicons name="options-outline" size={18} color={focusSessionTheme.accent} />
    </TouchableOpacity>
  );

  if (isFocusRunning) {
    const totalMs = activeDurationMs ?? selectedFocusMinutes * 60_000;
    const timerRingSize = isLandscape ? 210 : 260;
    const timerSize = isLandscape ? 116 : 180;
    const landscapeExtensionPrompt = (
      <View style={[styles.extensionPrompt, { backgroundColor: t.surface, borderColor: focusSessionTheme.accent + '66' }]}>
        <View style={styles.extensionPromptHeader}>
          <Text style={[styles.extensionPromptTitle, { color: t.textPrimary }]}>Keep going?</Text>
          <TouchableOpacity onPress={() => setShowFocusExtensionPrompt(false)} hitSlop={10} accessibilityLabel="Dismiss extend focus prompt" accessibilityRole="button">
            <Ionicons name="close" size={18} color={t.textMuted} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.extensionPromptText, { color: t.textMuted }]}>Your session ends soon.</Text>
        <View style={styles.extensionPromptActions}>
          <TouchableOpacity style={[styles.extensionPromptBtn, { backgroundColor: focusSessionTheme.accent }]} onPress={() => handleExtendFocus(5)} activeOpacity={0.8} accessibilityLabel="Extend focus by 5 minutes" accessibilityRole="button">
            <Text style={styles.extensionPromptBtnText}>+5 min</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.extensionPromptBtn, { backgroundColor: focusSessionTheme.accent }]} onPress={() => handleExtendFocus(10)} activeOpacity={0.8} accessibilityLabel="Extend focus by 10 minutes" accessibilityRole="button">
            <Text style={styles.extensionPromptBtnText}>+10 min</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
    const portraitExtensionPrompt = (
      <View style={[styles.extensionPromptCompact, { backgroundColor: t.surface, borderColor: focusSessionTheme.accent + '66' }]}>
        <Text style={[styles.extensionPromptCompactTitle, { color: t.textPrimary }]}>Keep going?</Text>
        <TouchableOpacity style={[styles.extensionPromptCompactBtn, { backgroundColor: focusSessionTheme.accent }]} onPress={() => handleExtendFocus(5)} activeOpacity={0.8} accessibilityLabel="Extend focus by 5 minutes" accessibilityRole="button">
          <Text style={styles.extensionPromptBtnText}>+5</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.extensionPromptCompactBtn, { backgroundColor: focusSessionTheme.accent }]} onPress={() => handleExtendFocus(10)} activeOpacity={0.8} accessibilityLabel="Extend focus by 10 minutes" accessibilityRole="button">
          <Text style={styles.extensionPromptBtnText}>+10</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowFocusExtensionPrompt(false)} hitSlop={10} accessibilityLabel="Dismiss extend focus prompt" accessibilityRole="button">
          <Ionicons name="close" size={18} color={t.textMuted} />
        </TouchableOpacity>
      </View>
    );

    return (
      <Animated.ScrollView entering={FadeIn.duration(400)} style={[styles.scrollScreen, { backgroundColor: t.focusBg }]} contentContainerStyle={isLandscape ? styles.focusRunningContentLandscape : styles.runningContent} scrollEnabled={!isLandscape} showsVerticalScrollIndicator={false}>
        <StatusBar barStyle="light-content" backgroundColor={t.focusBg} />

        {isLandscape ? (
          <>
            {/* Landscape: timer left, info + controls right */}
            <View style={styles.landscapeTimerCol}>
              <CircularTimer remainingMs={focusTimer.remainingMs} totalMs={totalMs} accent={focusSessionTheme.accent} trackColor={t.borderSubtle} glowColor={t.focusAccent + '12'} size={timerRingSize}>
                <CompanionView evolutionStage={evolutionStage} size={timerSize} isFocusing={focusTimer.isRunning || focusTimer.isPaused} isPaused={focusTimer.isPaused} />
              </CircularTimer>
              <TimerDisplay remainingMs={focusTimer.remainingMs} style={styles.timerDisplayLandscape} />
            </View>
            <View style={styles.focusLandscapeInfoCol}>
              <Text style={[styles.runningLabel, { color: t.textSecondary }]}>Focus Session</Text>
              {taskInput.length > 0 && <Text style={[styles.taskSubtitle, { color: t.textMuted }]} numberOfLines={1}>{taskInput}</Text>}
              {showFocusExtensionPrompt && landscapeExtensionPrompt}
              {focusTimer.isPaused && <Text style={[styles.pausedText, { color: t.xpGold }]}>Paused</Text>}
              <View style={styles.controls}>
                <TouchableOpacity style={[styles.controlBtn, { backgroundColor: focusSessionTheme.accent }]} onPress={focusTimer.isRunning ? handlePauseFocus : handleResumeFocus} activeOpacity={0.8} accessibilityLabel={focusTimer.isRunning ? 'Pause focus session' : 'Resume focus session'} accessibilityRole="button">
                  <Text style={styles.controlBtnText}>{focusTimer.isRunning ? 'Pause' : 'Resume'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.controlBtn, { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border }]} onPress={handleCancelFocus} activeOpacity={0.8} accessibilityLabel="Cancel focus session" accessibilityRole="button">
                  <Text style={[styles.controlBtnText, { color: t.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
              {landscapeSoundControl}
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.runningLabel, { color: t.textSecondary }]}>Focus Session</Text>
            {taskInput.length > 0 && <Text style={[styles.taskSubtitle, { color: t.textMuted }]} numberOfLines={1}>{taskInput}</Text>}
            <CircularTimer remainingMs={focusTimer.remainingMs} totalMs={totalMs} accent={focusSessionTheme.accent} trackColor={t.borderSubtle} glowColor={t.focusAccent + '12'} size={timerRingSize}>
              <CompanionView evolutionStage={evolutionStage} size={timerSize} isFocusing={focusTimer.isRunning || focusTimer.isPaused} isPaused={focusTimer.isPaused} />
            </CircularTimer>
            <TimerDisplay remainingMs={focusTimer.remainingMs} />
            {showFocusExtensionPrompt && portraitExtensionPrompt}
            {focusTimer.isPaused && <Text style={[styles.pausedText, { color: t.xpGold }]}>Paused</Text>}
            <View style={styles.controls}>
              <TouchableOpacity style={[styles.controlBtn, { backgroundColor: focusSessionTheme.accent }]} onPress={focusTimer.isRunning ? handlePauseFocus : handleResumeFocus} activeOpacity={0.8} accessibilityLabel={focusTimer.isRunning ? 'Pause focus session' : 'Resume focus session'} accessibilityRole="button">
                <Text style={styles.controlBtnText}>{focusTimer.isRunning ? 'Pause' : 'Resume'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.controlBtn, { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border }]} onPress={handleCancelFocus} activeOpacity={0.8} accessibilityLabel="Cancel focus session" accessibilityRole="button">
                <Text style={[styles.controlBtnText, { color: t.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
            {!showFocusExtensionPrompt && soundPicker}
          </>
        )}

        {__DEV__ && (
          <TouchableOpacity style={[styles.devBtn, { backgroundColor: t.surface, borderColor: t.devAccent }]} onPress={handleFocusComplete} activeOpacity={0.8}>
            <Text style={[styles.devBtnText, { color: t.devAccent }]}>⚡ Simulate Complete</Text>
          </TouchableOpacity>
        )}

        <RewardModal
          visible={showReward}
          result={rewardResult}
          task={taskInput}
          onDismiss={handleRewardDismiss}
          onGoalOutcome={(outcome) => {
            if (lastEntryIdRef.current) updateEntryOutcome(lastEntryIdRef.current, outcome);
          }}
          autoStartCountdown={autoStartBreak ? autoStartCountdown : undefined}
        />
        {soundPickerModal}
      </Animated.ScrollView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Break running phase
  // ─────────────────────────────────────────────────────────────────────────
  const breakLabel = isCurrentBreakLong ? 'Long Break' : 'Short Break';
  const breakGuidance = breakTimer.isPaused
    ? 'Paused. When you resume, follow the circles again.'
    : isCurrentBreakLong
      ? 'Follow the circles: breathe in as they grow, breathe out as they shrink. Then stretch a little.'
      : 'Follow the circles: breathe in as they grow, breathe out as they shrink.';

  const breakPrompt = (
    <View style={styles.breakPrompt}>
      <CompanionView
        evolutionStage={evolutionStage}
        size={116}
        tapTrigger={breakPetAnimationTrigger}
        onTap={handlePetCompanion}
      />
      <View style={[styles.breakSpeechBubble, { backgroundColor: t.surface, borderColor: breakSessionTheme.accent + '55' }]}>
        <Text style={[styles.breakSpeechText, { color: t.textPrimary }]}>{breakGuidance}</Text>
        <View style={[styles.speechTail, { borderRightColor: t.surface }]} />
      </View>
    </View>
  );

  const petBtn = (
    <TouchableOpacity
      style={[styles.petBtn, { backgroundColor: t.xpGold + '33', borderColor: t.xpGold }, breakInteracted && { backgroundColor: breakSessionTheme.accent + '33', borderColor: breakSessionTheme.accent }]}
      onPress={handlePetButtonPress}
      disabled={breakInteracted}
      activeOpacity={0.8}
      accessibilityLabel={breakInteracted ? 'Companion is happy' : 'Pet your companion'}
      accessibilityRole="button"
    >
      <Text style={[styles.petBtnText, { color: t.textPrimary }]}>{breakInteracted ? '💛 Companion is happy!' : '🐾 Pet your companion'}</Text>
    </TouchableOpacity>
  );

  const breakControls = (
    <View style={styles.controls}>
      <TouchableOpacity style={[styles.controlBtn, { backgroundColor: breakSessionTheme.accent }]} onPress={breakTimer.isRunning ? handlePauseBreak : handleResumeBreak} activeOpacity={0.8} accessibilityLabel={breakTimer.isRunning ? 'Pause break' : 'Resume break'} accessibilityRole="button">
        <Text style={styles.controlBtnText}>{breakTimer.isRunning ? 'Pause' : 'Resume'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.controlBtn, { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border }]} onPress={handleSkipBreak} activeOpacity={0.8} accessibilityLabel="Skip break" accessibilityRole="button">
        <Text style={[styles.controlBtnText, { color: t.textSecondary }]}>Skip Break</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Animated.ScrollView entering={FadeIn.duration(400)} style={[styles.scrollScreen, { backgroundColor: t.breakBg }]} contentContainerStyle={isLandscape ? styles.runningContentLandscape : styles.runningContent} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" backgroundColor={t.breakBg} />

      {isLandscape ? (
        <>
          <View style={styles.landscapeTimerCol}>
            {breakPrompt}
            <TimerDisplay remainingMs={breakTimer.remainingMs} style={{ color: breakSessionTheme.accent }} />
          </View>
          <View style={styles.landscapeInfoCol}>
            <Text style={[styles.runningLabel, { color: t.textSecondary }]}>{breakLabel}</Text>
            <BreathingAnimation color={breakSessionTheme.accent} isRunning={breakTimer.isRunning} />
            <View style={styles.breathingGap} />
            {breakTimer.isPaused && <Text style={[styles.pausedText, { color: t.xpGold }]}>Paused</Text>}
            {petBtn}
            {breakControls}
          </View>
        </>
      ) : (
        <>
          <Text style={[styles.runningLabel, { color: t.textSecondary }]}>{breakLabel}</Text>
          {breakPrompt}
          <BreathingAnimation color={breakSessionTheme.accent} isRunning={breakTimer.isRunning} />
          <View style={styles.breathingGap} />
          <TimerDisplay remainingMs={breakTimer.remainingMs} style={{ color: breakSessionTheme.accent }} />
          {breakTimer.isPaused && <Text style={[styles.pausedText, { color: t.xpGold }]}>Paused</Text>}
          {petBtn}
          {breakControls}
        </>
      )}

      <BreakEndModal visible={showBreakEnd} wasSkipped={breakWasSkipped} onStartNextFocus={handleBreakEndContinue} onFinishForNow={handleBreakEndFinish} />
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  breathingGap: {
    height: 32,
  },
  scrollScreen: {
    flex: 1,
  },
  setupContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 76,
    paddingBottom: 16,
  },
  setupContentLandscape: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingVertical: 18,
    justifyContent: 'center',
  },
  landscapeSetupColumns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  landscapeCol: {
    flex: 1,
  },
  landscapeColRight: {
    justifyContent: 'center',
  },
  runningContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
  },
  runningContentLandscape: {
    flexGrow: 1,
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    alignItems: 'center',
    gap: 24,
  },
  focusRunningContentLandscape: {
    flexGrow: 1,
    flexDirection: 'row',
    paddingHorizontal: 28,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  landscapeTimerCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  landscapeInfoCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  focusLandscapeInfoCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 52,
    right: 24,
    zIndex: 10,
    padding: 8,
  },
  closeBtnText: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeBtnLandscape: {
    top: 12,
    right: 18,
  },
  intentionPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 18,
  },
  intentionPromptLandscape: {
    gap: 10,
    marginBottom: 10,
  },
  speechBubble: {
    flex: 1,
    maxWidth: 310,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  speechTail: {
    position: 'absolute',
    left: -10,
    top: 32,
    width: 0,
    height: 0,
    borderTopWidth: 9,
    borderBottomWidth: 9,
    borderRightWidth: 10,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  speechText: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '700',
  },
  speechBubbleLandscape: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  speechTextLandscape: {
    fontSize: 17,
    lineHeight: 22,
  },
  breakPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    maxWidth: 430,
  },
  breakSpeechBubble: {
    flex: 1,
    maxWidth: 300,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  breakSpeechText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  taskCard: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
    marginBottom: 16,
  },
  taskCardLandscape: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    marginBottom: 10,
  },
  taskLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  taskLabelLandscape: {
    fontSize: 10,
    marginBottom: 2,
  },
  taskInput: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    paddingVertical: 6,
    minHeight: 44,
  },
  taskInputLandscape: {
    fontSize: 18,
    lineHeight: 23,
    minHeight: 34,
    paddingVertical: 2,
  },
  durationList: {
    gap: 10,
    marginBottom: 8,
  },
  durationListLandscape: {
    gap: 8,
    marginBottom: 10,
  },
  durationControl: {
    minHeight: 76,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  durationControlLandscape: {
    minHeight: 58,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 12,
  },
  durationTextBlock: {
    flex: 1,
    gap: 4,
  },
  durationLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  durationLabelLandscape: {
    fontSize: 10,
  },
  durationValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  durationValueLandscape: {
    fontSize: 18,
  },
  stepper: {
    flexDirection: 'row',
    gap: 10,
  },
  stepperLandscape: {
    gap: 8,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnLandscape: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  stepperBtnDisabled: {
    opacity: 0.35,
  },
  sessionCount: {
    fontSize: 14,
    marginBottom: 24,
  },
  sessionCountLandscape: {
    fontSize: 12,
    marginBottom: 0,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    justifyContent: 'center',
  },
  presetsRowLandscape: {
    gap: 8,
    marginBottom: 10,
  },
  presetChip: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  presetChipLandscape: {
    borderRadius: 12,
    paddingVertical: 7,
  },
  presetText: {
    fontSize: 16,
    fontWeight: '700',
  },
  presetTextLandscape: {
    fontSize: 14,
  },
  presetUnit: {
    fontSize: 10,
    fontWeight: '600',
  },
  presetUnitLandscape: {
    fontSize: 9,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tagRowLandscape: {
    gap: 6,
    marginBottom: 8,
  },
  tagChip: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tagChipLandscape: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tagChipTextLandscape: {
    fontSize: 11,
  },
  setupFloatingBar: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 24,
    borderTopWidth: 1,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  startIntentLine: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 2,
  },
  startIntentLineLandscape: {
    fontSize: 12,
    marginBottom: 0,
  },
  setupActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  setupActionRowLandscape: {
    gap: 8,
  },
  startBtn: {
    flex: 1.25,
    minHeight: 52,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnLandscape: {
    minHeight: 44,
    borderRadius: 14,
    paddingVertical: 10,
  },
  startBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  startBtnTextLandscape: {
    fontSize: 14,
  },
  startBreakBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  startBreakBtnLandscape: {
    minHeight: 44,
    borderRadius: 14,
    paddingVertical: 10,
  },
  startBreakBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  startBreakBtnTextLandscape: {
    fontSize: 13,
  },
  runningLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  runningSubLabel: {
    fontSize: 14,
    marginTop: -16,
  },
  pausedText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: -12,
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  controlBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  controlBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  timerDisplayLandscape: {
    fontSize: 52,
    letterSpacing: 2,
  },
  extensionPrompt: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  extensionPromptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  extensionPromptTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  extensionPromptText: {
    fontSize: 12,
    lineHeight: 16,
  },
  extensionPromptActions: {
    flexDirection: 'row',
    gap: 8,
  },
  extensionPromptBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extensionPromptBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  extensionPromptCompact: {
    width: '100%',
    minHeight: 48,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  extensionPromptCompactTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
  },
  extensionPromptCompactBtn: {
    minWidth: 54,
    minHeight: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petBtn: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  petBtnText: {
    fontWeight: '600',
    fontSize: 16,
  },
  devBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  devBtnText: {
    fontWeight: '600',
    fontSize: 14,
  },
  taskSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: -16,
    maxWidth: '80%',
    textAlign: 'center',
  },
  soundPickerContainer: {
    width: '100%',
    gap: 8,
  },
  soundPickerLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  soundPickerContent: {
    gap: 8,
    paddingHorizontal: 4,
  },
  landscapeSoundControl: {
    width: '100%',
    minHeight: 54,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  landscapeSoundText: {
    flex: 1,
    gap: 3,
  },
  landscapeSoundLabel: {
    textAlign: 'left',
  },
  landscapeSoundValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  soundChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 5,
  },
  soundChipIcon: {
    fontSize: 14,
  },
  soundChipLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  soundModal: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  soundModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  soundModalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  soundModalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  soundModalChip: {
    minWidth: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  soundModalChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
