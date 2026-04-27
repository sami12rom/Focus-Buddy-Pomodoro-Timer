import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  BackHandler,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useSessionStore } from '../store/sessionStore';
import { useCompanionStore, FocusRewardResult } from '../store/companionStore';
import { useStatsStore } from '../store/statsStore';
import { useSessionHistoryStore } from '../store/sessionHistoryStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTimer } from '../hooks/useTimer';
import { useTheme } from '../hooks/useTheme';
import { getSessionTheme } from '../constants/colors';
import { FOCUS_SESSIONS_BEFORE_LONG_BREAK } from '../constants/game';
import TimerDisplay from '../components/TimerDisplay';
import CompanionView from '../components/CompanionView';
import CircularTimer from '../components/CircularTimer';
import DrumPicker from '../components/DrumPicker';
import RewardModal from '../components/RewardModal';
import BreakEndModal from '../components/BreakEndModal';
import {
  scheduleSessionEndNotification,
  cancelScheduledNotification,
  fireCompletionAlarm,
  requestNotificationPermissions,
} from '../utils/notifications';
import * as Haptics from 'expo-haptics';


export default function TimerScreen() {
  const router = useRouter();
  const t = useTheme();

  const {
    status, reset,
    startFocus, pauseFocus, resumeFocus,
    startBreak, pauseBreak, resumeBreak,
    interactDuringBreak, breakInteracted,
    selectedFocusMinutes, selectedBreakMinutes, selectedLongBreakMinutes,
    setFocusMinutes, setBreakMinutes, setCurrentTask,
    completedFocusesInCycle, isCurrentBreakLong,
    incrementCycle, resetCycle, clearSnapshot,
  } = useSessionStore();

  const { evolutionStage, applyFocusReward, applyBreakInteraction } = useCompanionStore();
  const { todaySessions, recordCompletedSession } = useStatsStore();
  const { addEntry } = useSessionHistoryStore();
  const { soundEnabled, hapticsEnabled, keepAwakeEnabled } = useSettingsStore();

  const [taskInput, setTaskInput] = useState('');
  const [rewardResult, setRewardResult] = useState<FocusRewardResult | null>(null);
  const [showReward, setShowReward] = useState(false);
  const [showBreakEnd, setShowBreakEnd] = useState(false);
  const [breakWasSkipped, setBreakWasSkipped] = useState(false);

  const focusSessionTheme = getSessionTheme(t, 'focus');
  const breakSessionTheme = getSessionTheme(t, 'break');

  const isIdle = status === 'idle';
  const isFocusRunning = status === 'running' || status === 'paused';
  const isBreakRunning = status === 'break_running' || status === 'break_paused';

  useFocusEffect(
    useCallback(() => {
      // Only reset when a break is unexpectedly active on this screen.
      // A running focus session must survive tab navigation.
      if (isBreakRunning) reset();
    }, []) // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── Focus timer ──────────────────────────────────────────────────────────
  const handleFocusComplete = useCallback(() => {
    deactivateKeepAwake();
    cancelScheduledNotification();
    if (soundEnabled) fireCompletionAlarm('focus');
    if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Increment cycle BEFORE reading it in startBreak
    incrementCycle();

    const result = applyFocusReward();

    // Record stats with actual duration
    recordCompletedSession(selectedFocusMinutes);

    // Add session history entry
    const today = new Date().toISOString().slice(0, 10);
    addEntry({
      date: today,
      task: taskInput,
      durationMinutes: selectedFocusMinutes,
      completedAt: new Date().toISOString(),
    });

    setRewardResult(result);
    setShowReward(true);
  }, [applyFocusReward, recordCompletedSession, addEntry, soundEnabled, hapticsEnabled,
      selectedFocusMinutes, taskInput, incrementCycle]);

  const focusTimer = useTimer('focus', handleFocusComplete);

  // ── Break timer ───────────────────────────────────────────────────────────
  const handleBreakComplete = useCallback(() => {
    deactivateKeepAwake();
    cancelScheduledNotification();
    if (soundEnabled) fireCompletionAlarm('break');
    if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (isCurrentBreakLong) resetCycle();
    setBreakWasSkipped(false);
    setShowBreakEnd(true);
    // reset() is deferred until user makes a choice in BreakEndModal
  }, [soundEnabled, hapticsEnabled, isCurrentBreakLong, resetCycle]);

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
  async function handleStart() {
    // Ask for notification permission on first session — not on Home mount (item 5)
    await requestNotificationPermissions();
    setCurrentTask(taskInput);
    startFocus();
    if (keepAwakeEnabled) activateKeepAwakeAsync();
    scheduleSessionEndNotification(selectedFocusMinutes * 60_000, 'focus');
  }

  async function handleStartBreak() {
    await requestNotificationPermissions();
    setCurrentTask(taskInput);
    // isManual=true → always short break regardless of cycle count
    startBreak(true);
    if (keepAwakeEnabled) activateKeepAwakeAsync();
    scheduleSessionEndNotification(selectedBreakMinutes * 60_000, 'break');
  }

  // ── Focus running actions ─────────────────────────────────────────────────
  function handlePauseFocus() {
    pauseFocus();
    cancelScheduledNotification();
  }

  function handleResumeFocus() {
    resumeFocus();
    scheduleSessionEndNotification(focusTimer.remainingMs, 'focus');
  }

  function handleCancelFocus() {
    deactivateKeepAwake();
    cancelScheduledNotification();
    reset();
    clearSnapshot();
  }

  function handleRewardDismiss() {
    setShowReward(false);
    // Determine break type BEFORE startBreak reads cycle count
    // (incrementCycle was already called in handleFocusComplete)
    const isLong = completedFocusesInCycle >= FOCUS_SESSIONS_BEFORE_LONG_BREAK;
    const breakDurationMs = (isLong ? selectedLongBreakMinutes : selectedBreakMinutes) * 60_000;
    startBreak(); // reads completedFocusesInCycle internally to set isCurrentBreakLong
    if (keepAwakeEnabled) activateKeepAwakeAsync();
    scheduleSessionEndNotification(breakDurationMs, 'break');
  }

  // ── Break running actions ─────────────────────────────────────────────────
  function handlePauseBreak() {
    pauseBreak();
    cancelScheduledNotification();
  }

  function handleResumeBreak() {
    resumeBreak();
    scheduleSessionEndNotification(breakTimer.remainingMs, 'break');
  }

  function handlePetCompanion() {
    if (breakInteracted) return;
    interactDuringBreak();
    applyBreakInteraction();
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
    clearSnapshot();
    // Stay on this screen in idle state → user enters next task and starts
  }

  function handleBreakEndFinish() {
    setShowBreakEnd(false);
    reset();
    setTaskInput('');
    clearSnapshot();
    router.replace('/(tabs)');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Setup phase
  // ─────────────────────────────────────────────────────────────────────────
  if (isIdle) {
    return (
      <KeyboardAvoidingView
        style={[styles.screen, { backgroundColor: t.focusBg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <StatusBar barStyle="light-content" backgroundColor={t.focusBg} />

        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityLabel="Close"
          accessibilityRole="button"
        >
          <Text style={[styles.closeBtnText, { color: t.textMuted }]}>✕</Text>
        </TouchableOpacity>

        {/* Dual duration pickers — set focus + break time once */}
        <View style={styles.durationRow}>
          <View style={styles.durationBlock}>
            <Text style={[styles.durationLabel, { color: focusSessionTheme.accent }]}>Focus</Text>
            <View style={styles.pickerRow}>
              <DrumPicker
                value={selectedFocusMinutes}
                min={1}
                max={120}
                color={focusSessionTheme.accent}
                onChange={setFocusMinutes}
              />
              <Text style={[styles.pickerUnit, { color: focusSessionTheme.accent }]}>min</Text>
            </View>
          </View>

          <View style={[styles.durationDivider, { backgroundColor: t.border }]} />

          <View style={styles.durationBlock}>
            <Text style={[styles.durationLabel, { color: breakSessionTheme.accent }]}>Break</Text>
            <View style={styles.pickerRow}>
              <DrumPicker
                value={selectedBreakMinutes}
                min={1}
                max={30}
                color={breakSessionTheme.accent}
                onChange={setBreakMinutes}
              />
              <Text style={[styles.pickerUnit, { color: breakSessionTheme.accent }]}>min</Text>
            </View>
          </View>
        </View>

        <View style={[styles.taskRow, { borderBottomColor: focusSessionTheme.accent + '60' }]}>
          <Text style={[styles.taskHash, { color: focusSessionTheme.accent }]}>#</Text>
          <TextInput
            style={[styles.taskInput, { color: t.textPrimary }]}
            placeholder="What's your focus today?"
            placeholderTextColor={t.textMuted}
            value={taskInput}
            onChangeText={setTaskInput}
            returnKeyType="done"
            maxLength={80}
          />
        </View>

        <Text style={[styles.sessionCount, { color: t.textMuted }]}>
          Session #{todaySessions + 1}
        </Text>

        <TouchableOpacity
          style={[styles.startBtn, { backgroundColor: focusSessionTheme.accent }]}
          onPress={handleStart}
          activeOpacity={0.85}
          accessibilityLabel="Start focus session"
          accessibilityRole="button"
        >
          <Text style={styles.startBtnText}>Start Focus Session</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.startBreakBtn, { borderColor: breakSessionTheme.accent }]}
          onPress={handleStartBreak}
          activeOpacity={0.85}
          accessibilityLabel="Take a break"
          accessibilityRole="button"
        >
          <Text style={[styles.startBreakBtnText, { color: breakSessionTheme.accent }]}>Take a Break</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Focus running phase
  // ─────────────────────────────────────────────────────────────────────────
  if (isFocusRunning) {
    const totalMs = selectedFocusMinutes * 60_000;

    return (
      <View style={[styles.screen, styles.runningScreen, { backgroundColor: t.focusBg }]}>
        <StatusBar barStyle="light-content" backgroundColor={t.focusBg} />

        {/* Lo-fi study room decor */}
        <Text style={[styles.decor, { top: 72, left: 28 }]}>📚</Text>
        <Text style={[styles.decor, { top: 96, right: 28 }]}>☕</Text>
        <Text style={[styles.decor, { bottom: 148, left: 20 }]}>🪴</Text>

        <Text style={[styles.runningLabel, { color: t.textSecondary }]}>Focus Session</Text>

        {taskInput.length > 0 && (
          <Text style={[styles.taskSubtitle, { color: t.textMuted }]} numberOfLines={1}>
            {taskInput}
          </Text>
        )}

        <CircularTimer
          remainingMs={focusTimer.remainingMs}
          totalMs={totalMs}
          accent={focusSessionTheme.accent}
          trackColor={t.borderSubtle}
          glowColor={t.focusAccent + '12'}
        >
          <CompanionView
            evolutionStage={evolutionStage}
            size={180}
            isFocusing={focusTimer.isRunning || focusTimer.isPaused}
            isPaused={focusTimer.isPaused}
          />
        </CircularTimer>

        <TimerDisplay remainingMs={focusTimer.remainingMs} />

        {focusTimer.isPaused && <Text style={[styles.pausedText, { color: t.xpGold }]}>Paused</Text>}

        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlBtn, { backgroundColor: focusSessionTheme.accent }]}
            onPress={focusTimer.isRunning ? handlePauseFocus : handleResumeFocus}
            activeOpacity={0.8}
            accessibilityLabel={focusTimer.isRunning ? 'Pause focus session' : 'Resume focus session'}
            accessibilityRole="button"
          >
            <Text style={styles.controlBtnText}>
              {focusTimer.isRunning ? 'Pause' : 'Resume'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlBtn, { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border }]}
            onPress={handleCancelFocus}
            activeOpacity={0.8}
            accessibilityLabel="Cancel focus session"
            accessibilityRole="button"
          >
            <Text style={[styles.controlBtnText, { color: t.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {__DEV__ && (
          <TouchableOpacity
            style={[styles.devBtn, { backgroundColor: t.surface, borderColor: t.devAccent }]}
            onPress={handleFocusComplete}
            activeOpacity={0.8}
          >
            <Text style={[styles.devBtnText, { color: t.devAccent }]}>⚡ Simulate Complete</Text>
          </TouchableOpacity>
        )}

        <RewardModal visible={showReward} result={rewardResult} task={taskInput} onDismiss={handleRewardDismiss} />
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Break running phase
  // ─────────────────────────────────────────────────────────────────────────
  const breakLabel = isCurrentBreakLong ? 'Long Break' : 'Short Break';

  return (
    <View style={[styles.screen, styles.runningScreen, { backgroundColor: t.breakBg }]}>
      <StatusBar barStyle="light-content" backgroundColor={t.breakBg} />

      <Text style={[styles.runningLabel, { color: t.textSecondary }]}>{breakLabel}</Text>
      <Text style={[styles.runningSubLabel, { color: breakSessionTheme.accent }]}>Rest and recharge</Text>

      <CompanionView evolutionStage={evolutionStage} size={160} />

      <TimerDisplay remainingMs={breakTimer.remainingMs} style={{ color: breakSessionTheme.accent }} />

      {breakTimer.isPaused && <Text style={[styles.pausedText, { color: t.xpGold }]}>Paused</Text>}

      <TouchableOpacity
        style={[
          styles.petBtn,
          { backgroundColor: t.xpGold + '33', borderColor: t.xpGold },
          breakInteracted && { backgroundColor: breakSessionTheme.accent + '33', borderColor: breakSessionTheme.accent },
        ]}
        onPress={handlePetCompanion}
        disabled={breakInteracted}
        activeOpacity={0.8}
        accessibilityLabel={breakInteracted ? 'Companion is happy' : 'Pet your companion'}
        accessibilityRole="button"
      >
        <Text style={[styles.petBtnText, { color: t.textPrimary }]}>
          {breakInteracted ? '💛 Companion is happy!' : '🐾 Pet your companion'}
        </Text>
      </TouchableOpacity>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlBtn, { backgroundColor: breakSessionTheme.accent }]}
          onPress={breakTimer.isRunning ? handlePauseBreak : handleResumeBreak}
          activeOpacity={0.8}
          accessibilityLabel={breakTimer.isRunning ? 'Pause break' : 'Resume break'}
          accessibilityRole="button"
        >
          <Text style={styles.controlBtnText}>
            {breakTimer.isRunning ? 'Pause' : 'Resume'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border }]}
          onPress={handleSkipBreak}
          activeOpacity={0.8}
          accessibilityLabel="Skip break"
          accessibilityRole="button"
        >
          <Text style={[styles.controlBtnText, { color: t.textSecondary }]}>Skip Break</Text>
        </TouchableOpacity>
      </View>

      {/* Break completion choice — shown after break ends or is skipped */}
      <BreakEndModal
        visible={showBreakEnd}
        wasSkipped={breakWasSkipped}
        onStartNextFocus={handleBreakEndContinue}
        onFinishForNow={handleBreakEndFinish}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 40,
  },
  runningScreen: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
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
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 36,
  },
  pickerUnit: {
    fontSize: 22,
    fontWeight: '600',
    marginTop: 4,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingBottom: 10,
    marginBottom: 20,
    gap: 8,
  },
  taskHash: {
    fontSize: 18,
    fontWeight: '700',
  },
  taskInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    marginBottom: 8,
  },
  durationBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  durationLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  durationDivider: {
    width: 1,
    height: 80,
    marginHorizontal: 8,
    opacity: 0.4,
  },
  sessionCount: {
    fontSize: 14,
    marginBottom: 24,
  },
  startBtn: {
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
  },
  startBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  startBreakBtn: {
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    marginTop: 12,
  },
  startBreakBtnText: {
    fontSize: 16,
    fontWeight: '600',
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
  decor: {
    position: 'absolute',
    fontSize: 26,
    opacity: 0.45,
  },
});
