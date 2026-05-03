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
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
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
import TimerDisplay from '../components/TimerDisplay';
import CompanionView from '../components/CompanionView';
import CircularTimer from '../components/CircularTimer';
import DrumPicker from '../components/DrumPicker';
import RewardModal from '../components/RewardModal';
import BreakEndModal from '../components/BreakEndModal';
import BreathingAnimation from '../components/BreathingAnimation';
import {
  scheduleSessionEndNotification,
  cancelScheduledNotification,
  fireCompletionAlarm,
  fireAchievementNotification,
} from '../utils/notifications';
import { getAchievements } from '../utils/achievements';
import * as Haptics from 'expo-haptics';
import * as StoreReview from 'expo-store-review';


export default function TimerScreen() {
  const router = useRouter();
  const t = useTheme();

  const {
    status, reset,
    startFocus, pauseFocus, resumeFocus,
    startBreak, pauseBreak, resumeBreak,
    interactDuringBreak, breakInteracted,
    selectedFocusMinutes, selectedBreakMinutes, currentTag,
    setFocusMinutes, setBreakMinutes, setCurrentTask, setCurrentTag,
    isCurrentBreakLong,
    incrementCycle, resetCycle, clearSnapshot,
  } = useSessionStore();

  const { evolutionStage, applyFocusReward, applyBreakInteraction } = useCompanionStore();
  const { todaySessions, recordCompletedSession, recordLongBreakCompleted, markAchievementsNotified } = useStatsStore();
  const { addEntry } = useSessionHistoryStore();
  const { soundEnabled, hapticsEnabled, keepAwakeEnabled, autoStartBreak } = useSettingsStore();

  const [taskInput, setTaskInput] = useState('');
  const [rewardResult, setRewardResult] = useState<FocusRewardResult | null>(null);
  const [showReward, setShowReward] = useState(false);
  const [showBreakEnd, setShowBreakEnd] = useState(false);
  const [breakWasSkipped, setBreakWasSkipped] = useState(false);
  const [autoStartCountdown, setAutoStartCountdown] = useState<number | undefined>(undefined);
  const rewardDismissedRef = useRef(false);

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
    const today = getLocalDateKey();
    addEntry({
      date: today,
      task: taskInput,
      tag: currentTag,
      durationMinutes: selectedFocusMinutes,
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

  // ── Break timer ───────────────────────────────────────────────────────────
  const handleBreakComplete = useCallback(() => {
    deactivateKeepAwake();
    cancelScheduledNotification();
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
    setCurrentTask(taskInput);
    startFocus();
    if (keepAwakeEnabled) activateKeepAwakeAsync();
    scheduleSessionEndNotification(selectedFocusMinutes * 60_000, 'focus');
  }

  function handleStartBreak() {
    setCurrentTask(taskInput);
    // isManual=true → always short break regardless of cycle count
    const breakDurationMs = startBreak(true);
    if (keepAwakeEnabled) activateKeepAwakeAsync();
    scheduleSessionEndNotification(breakDurationMs, 'break');
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
    if (rewardDismissedRef.current) return;
    rewardDismissedRef.current = true;
    setShowReward(false);
    setAutoStartCountdown(undefined);
    const breakDurationMs = startBreak();
    if (keepAwakeEnabled) activateKeepAwakeAsync();
    scheduleSessionEndNotification(breakDurationMs, 'break');
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
    const pickerBlock = (
      <>
        {/* Quick presets */}
        <View style={styles.presetsRow}>
          {PRESETS.map((p) => {
            const isActive = selectedFocusMinutes === p.focus && selectedBreakMinutes === p.break;
            return (
              <TouchableOpacity
                key={`${p.focus}/${p.break}`}
                style={[styles.presetChip, { backgroundColor: isActive ? focusSessionTheme.accent : t.surface, borderColor: isActive ? focusSessionTheme.accent : t.border }]}
                onPress={() => { setFocusMinutes(p.focus); setBreakMinutes(p.break); }}
                activeOpacity={0.8}
                accessibilityLabel={`${p.focus} minute focus, ${p.break} minute break preset`}
                accessibilityRole="button"
              >
                <Text style={[styles.presetText, { color: isActive ? '#fff' : t.textSecondary }]}>{p.focus}/{p.break}</Text>
                <Text style={[styles.presetUnit, { color: isActive ? 'rgba(255,255,255,0.7)' : t.textMuted }]}>min</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Duration pickers */}
        <View style={styles.durationRow}>
          <View style={styles.durationBlock}>
            <Text style={[styles.durationLabel, { color: focusSessionTheme.accent }]}>Focus</Text>
            <View style={styles.pickerRow}>
              <DrumPicker value={selectedFocusMinutes} min={1} max={120} color={focusSessionTheme.accent} onChange={setFocusMinutes} />
              <Text style={[styles.pickerUnit, { color: focusSessionTheme.accent }]}>min</Text>
            </View>
          </View>
          <View style={[styles.durationDivider, { backgroundColor: t.border }]} />
          <View style={styles.durationBlock}>
            <Text style={[styles.durationLabel, { color: breakSessionTheme.accent }]}>Break</Text>
            <View style={styles.pickerRow}>
              <DrumPicker value={selectedBreakMinutes} min={1} max={30} color={breakSessionTheme.accent} onChange={setBreakMinutes} />
              <Text style={[styles.pickerUnit, { color: breakSessionTheme.accent }]}>min</Text>
            </View>
          </View>
        </View>
      </>
    );

    const inputBlock = (
      <>
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

        <View style={styles.tagRow}>
          {SESSION_TAGS.map((tag) => {
            const active = currentTag === tag;
            return (
              <TouchableOpacity
                key={tag}
                style={[styles.tagChip, { backgroundColor: active ? focusSessionTheme.accent : t.surface, borderColor: active ? focusSessionTheme.accent : t.border }]}
                onPress={() => setCurrentTag(tag)}
                activeOpacity={0.8}
                accessibilityLabel={`${tag} session tag`}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.tagChipText, { color: active ? '#fff' : t.textSecondary }]}>{tag}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sessionCount, { color: t.textMuted }]}>Session #{todaySessions + 1}</Text>

        <TouchableOpacity style={[styles.startBtn, { backgroundColor: focusSessionTheme.accent }]} onPress={handleStart} activeOpacity={0.85} accessibilityLabel="Start focus session" accessibilityRole="button">
          <Text style={styles.startBtnText}>Start Focus Session</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.startBreakBtn, { borderColor: breakSessionTheme.accent }]} onPress={handleStartBreak} activeOpacity={0.85} accessibilityLabel="Take a break" accessibilityRole="button">
          <Text style={[styles.startBreakBtnText, { color: breakSessionTheme.accent }]}>Take a Break</Text>
        </TouchableOpacity>
      </>
    );

    return (
      <KeyboardAvoidingView style={[styles.screen, { backgroundColor: t.focusBg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.ScrollView entering={FadeIn.duration(350)} style={styles.scrollScreen} contentContainerStyle={isLandscape ? styles.setupContentLandscape : styles.setupContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <StatusBar barStyle="light-content" backgroundColor={t.focusBg} />
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()} hitSlop={12} accessibilityLabel="Close" accessibilityRole="button">
            <Text style={[styles.closeBtnText, { color: t.textMuted }]}>✕</Text>
          </TouchableOpacity>

          {isLandscape ? (
            <View style={styles.landscapeSetupColumns}>
              <View style={styles.landscapeCol}>{pickerBlock}</View>
              <View style={[styles.landscapeCol, styles.landscapeColRight]}>{inputBlock}</View>
            </View>
          ) : (
            <>
              {pickerBlock}
              {inputBlock}
            </>
          )}
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Focus running phase
  // ─────────────────────────────────────────────────────────────────────────
  if (isFocusRunning) {
    const totalMs = selectedFocusMinutes * 60_000;
    const timerSize = isLandscape ? 140 : 180;

    return (
      <Animated.ScrollView entering={FadeIn.duration(400)} style={[styles.scrollScreen, { backgroundColor: t.focusBg }]} contentContainerStyle={isLandscape ? styles.runningContentLandscape : styles.runningContent} showsVerticalScrollIndicator={false}>
        <StatusBar barStyle="light-content" backgroundColor={t.focusBg} />

        {!isLandscape && (
          <>
            <Text style={[styles.decor, { top: 72, left: 28 }]}>📚</Text>
            <Text style={[styles.decor, { top: 96, right: 28 }]}>☕</Text>
            <Text style={[styles.decor, { bottom: 148, left: 20 }]}>🪴</Text>
          </>
        )}

        {isLandscape ? (
          <>
            {/* Landscape: timer left, info + controls right */}
            <View style={styles.landscapeTimerCol}>
              <CircularTimer remainingMs={focusTimer.remainingMs} totalMs={totalMs} accent={focusSessionTheme.accent} trackColor={t.borderSubtle} glowColor={t.focusAccent + '12'}>
                <CompanionView evolutionStage={evolutionStage} size={timerSize} isFocusing={focusTimer.isRunning || focusTimer.isPaused} isPaused={focusTimer.isPaused} />
              </CircularTimer>
              <TimerDisplay remainingMs={focusTimer.remainingMs} />
            </View>
            <View style={styles.landscapeInfoCol}>
              <Text style={[styles.runningLabel, { color: t.textSecondary }]}>Focus Session</Text>
              {taskInput.length > 0 && <Text style={[styles.taskSubtitle, { color: t.textMuted }]} numberOfLines={1}>{taskInput}</Text>}
              {focusTimer.isPaused && <Text style={[styles.pausedText, { color: t.xpGold }]}>Paused</Text>}
              <View style={styles.controls}>
                <TouchableOpacity style={[styles.controlBtn, { backgroundColor: focusSessionTheme.accent }]} onPress={focusTimer.isRunning ? handlePauseFocus : handleResumeFocus} activeOpacity={0.8} accessibilityLabel={focusTimer.isRunning ? 'Pause focus session' : 'Resume focus session'} accessibilityRole="button">
                  <Text style={styles.controlBtnText}>{focusTimer.isRunning ? 'Pause' : 'Resume'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.controlBtn, { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border }]} onPress={handleCancelFocus} activeOpacity={0.8} accessibilityLabel="Cancel focus session" accessibilityRole="button">
                  <Text style={[styles.controlBtnText, { color: t.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.runningLabel, { color: t.textSecondary }]}>Focus Session</Text>
            {taskInput.length > 0 && <Text style={[styles.taskSubtitle, { color: t.textMuted }]} numberOfLines={1}>{taskInput}</Text>}
            <CircularTimer remainingMs={focusTimer.remainingMs} totalMs={totalMs} accent={focusSessionTheme.accent} trackColor={t.borderSubtle} glowColor={t.focusAccent + '12'}>
              <CompanionView evolutionStage={evolutionStage} size={timerSize} isFocusing={focusTimer.isRunning || focusTimer.isPaused} isPaused={focusTimer.isPaused} />
            </CircularTimer>
            <TimerDisplay remainingMs={focusTimer.remainingMs} />
            {focusTimer.isPaused && <Text style={[styles.pausedText, { color: t.xpGold }]}>Paused</Text>}
            <View style={styles.controls}>
              <TouchableOpacity style={[styles.controlBtn, { backgroundColor: focusSessionTheme.accent }]} onPress={focusTimer.isRunning ? handlePauseFocus : handleResumeFocus} activeOpacity={0.8} accessibilityLabel={focusTimer.isRunning ? 'Pause focus session' : 'Resume focus session'} accessibilityRole="button">
                <Text style={styles.controlBtnText}>{focusTimer.isRunning ? 'Pause' : 'Resume'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.controlBtn, { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border }]} onPress={handleCancelFocus} activeOpacity={0.8} accessibilityLabel="Cancel focus session" accessibilityRole="button">
                <Text style={[styles.controlBtnText, { color: t.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {__DEV__ && (
          <TouchableOpacity style={[styles.devBtn, { backgroundColor: t.surface, borderColor: t.devAccent }]} onPress={handleFocusComplete} activeOpacity={0.8}>
            <Text style={[styles.devBtnText, { color: t.devAccent }]}>⚡ Simulate Complete</Text>
          </TouchableOpacity>
        )}

        <RewardModal visible={showReward} result={rewardResult} task={taskInput} onDismiss={handleRewardDismiss} autoStartCountdown={autoStartBreak ? autoStartCountdown : undefined} />
      </Animated.ScrollView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Break running phase
  // ─────────────────────────────────────────────────────────────────────────
  const breakLabel = isCurrentBreakLong ? 'Long Break' : 'Short Break';
  const petBtn = (
    <TouchableOpacity
      style={[styles.petBtn, { backgroundColor: t.xpGold + '33', borderColor: t.xpGold }, breakInteracted && { backgroundColor: breakSessionTheme.accent + '33', borderColor: breakSessionTheme.accent }]}
      onPress={handlePetCompanion}
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
            <CompanionView evolutionStage={evolutionStage} size={120} />
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
          <CompanionView evolutionStage={evolutionStage} size={140} />
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
    paddingTop: 56,
    paddingBottom: 64,
  },
  setupContentLandscape: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  landscapeSetupColumns: {
    flexDirection: 'row',
    gap: 24,
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
  presetsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    justifyContent: 'center',
  },
  presetChip: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  presetText: {
    fontSize: 16,
    fontWeight: '700',
  },
  presetUnit: {
    fontSize: 10,
    fontWeight: '600',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tagChip: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '700',
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
