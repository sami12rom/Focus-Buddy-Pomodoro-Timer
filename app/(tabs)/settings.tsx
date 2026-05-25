import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useThemeStore } from '../../store/themeStore';
import { useSessionStore } from '../../store/sessionStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useGoalStore } from '../../store/goalStore';
import { THEME_LIST, ThemeId, AppTheme } from '../../constants/colors';
import { LONG_BREAK_MINUTES_MIN, LONG_BREAK_MINUTES_MAX } from '../../constants/game';
import { AMBIENT_SOUNDS, BREAK_SOUNDS, VOLUME_STEPS } from '../../constants/sounds';
import { resetAllAppData } from '../../utils/resetAppData';

export default function SettingsScreen() {
  const router = useRouter();
  const t = useTheme();
  const { activeThemeId, setTheme } = useThemeStore();
  const { selectedLongBreakMinutes, setLongBreakMinutes } = useSessionStore();
  const {
    soundEnabled, hapticsEnabled, keepAwakeEnabled, autoStartBreak,
    ambientSounds, ambientVolume, playAmbientDuringBreak, breakSound,
    setSoundEnabled, setHapticsEnabled, setKeepAwakeEnabled, setAutoStartBreak,
    toggleAmbientSound, setAmbientVolume, setPlayAmbientDuringBreak, setBreakSound,
  } = useSettingsStore();
  const { dailySessionGoal, dailyMinuteGoal, setDailySessionGoal, setDailyMinuteGoal } = useGoalStore();

  function handleResetData() {
    Alert.alert(
      'Reset App Data',
      'This will permanently delete all your progress, sessions, and companion data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: resetAllAppData,
        },
      ]
    );
  }

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: t.bg }]}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="light-content" backgroundColor={t.bg} />

      <Text style={[styles.title, { color: t.textPrimary }]}>Settings</Text>

      {/* ── Appearance ── */}
      <Text style={[styles.sectionLabel, { color: t.textMuted }]}>Appearance</Text>

      <View style={styles.grid}>
        {THEME_LIST.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            active={theme.id === activeThemeId}
            activeAccent={t.focusAccent}
            onPress={() => setTheme(theme.id as ThemeId)}
          />
        ))}
      </View>

      {/* ── Behavior toggles (items 6) ── */}
      <Text style={[styles.sectionLabel, { color: t.textMuted }]}>Behavior</Text>

      <View style={[styles.card, { backgroundColor: t.surface }]}>
        <ToggleRow
          label="Sound"
          description="Play a sound when sessions end"
          value={soundEnabled}
          onToggle={setSoundEnabled}
          accent={t.focusAccent}
          t={t}
        />
        <View style={[styles.divider, { backgroundColor: t.borderSubtle }]} />
        <ToggleRow
          label="Haptics"
          description="Vibrate on session events"
          value={hapticsEnabled}
          onToggle={setHapticsEnabled}
          accent={t.focusAccent}
          t={t}
        />
        <View style={[styles.divider, { backgroundColor: t.borderSubtle }]} />
        <ToggleRow
          label="Keep screen awake"
          description="Prevent screen from sleeping during sessions"
          value={keepAwakeEnabled}
          onToggle={setKeepAwakeEnabled}
          accent={t.focusAccent}
          t={t}
        />
        <View style={[styles.divider, { backgroundColor: t.borderSubtle }]} />
        <ToggleRow
          label="Auto-start break"
          description="Break begins automatically after focus completes"
          value={autoStartBreak}
          onToggle={setAutoStartBreak}
          accent={t.focusAccent}
          t={t}
        />
      </View>

      {/* ── Daily focus goals ── */}
      <Text style={[styles.sectionLabel, { color: t.textMuted }]}>Daily Goals</Text>

      <View style={[styles.card, { backgroundColor: t.surface }]}>
        <GoalStepper
          label="Sessions"
          description="Target completed focus sessions per day"
          value={dailySessionGoal}
          suffix=""
          onDecrease={() => setDailySessionGoal(dailySessionGoal - 1)}
          onIncrease={() => setDailySessionGoal(dailySessionGoal + 1)}
          t={t}
        />
        <View style={[styles.divider, { backgroundColor: t.borderSubtle }]} />
        <GoalStepper
          label="Focus minutes"
          description="Target focused minutes per day"
          value={dailyMinuteGoal}
          suffix="m"
          onDecrease={() => setDailyMinuteGoal(dailyMinuteGoal - 15)}
          onIncrease={() => setDailyMinuteGoal(dailyMinuteGoal + 15)}
          t={t}
        />
      </View>

      {/* ── Long break duration (item 2) ── */}
      <Text style={[styles.sectionLabel, { color: t.textMuted }]}>Long Break</Text>

      <View style={[styles.card, { backgroundColor: t.surface }]}>
        <View style={styles.stepperRow}>
          <View style={styles.stepperLeft}>
            <Text style={[styles.stepperLabel, { color: t.textPrimary }]}>Duration</Text>
            <Text style={[styles.stepperDesc, { color: t.textMuted }]}>
              Auto-started after every 4 focus sessions
            </Text>
          </View>
          <View style={styles.stepperControls}>
            <TouchableOpacity
              style={[styles.stepperBtn, { backgroundColor: t.surfaceRaised }]}
              onPress={() =>
                setLongBreakMinutes(Math.max(LONG_BREAK_MINUTES_MIN, selectedLongBreakMinutes - 1))
              }
              activeOpacity={0.7}
              hitSlop={8}
            >
              <Text style={[styles.stepperBtnText, { color: t.textPrimary }]}>−</Text>
            </TouchableOpacity>
            <Text style={[styles.stepperValue, { color: t.focusAccent }]}>
              {selectedLongBreakMinutes}m
            </Text>
            <TouchableOpacity
              style={[styles.stepperBtn, { backgroundColor: t.surfaceRaised }]}
              onPress={() =>
                setLongBreakMinutes(Math.min(LONG_BREAK_MINUTES_MAX, selectedLongBreakMinutes + 1))
              }
              activeOpacity={0.7}
              hitSlop={8}
            >
              <Text style={[styles.stepperBtnText, { color: t.textPrimary }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Ambient Sounds ── */}
      <Text style={[styles.sectionLabel, { color: t.textMuted }]}>Ambient Sounds</Text>

      <View style={[styles.card, { backgroundColor: t.surface }]}>
        <Text style={[styles.ambientHint, { color: t.textMuted }]}>
          Choose up to 2 layers
        </Text>

        {/* Sound picker */}
        <View style={styles.ambientPicker}>
          {AMBIENT_SOUNDS.map((s) => {
            const active = s.id === 'none' ? ambientSounds.length === 0 : ambientSounds.includes(s.id);
            const disabled = s.id !== 'none' && s.uri === null;
            return (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.soundChip,
                  {
                    backgroundColor: active ? t.focusAccent : t.surfaceRaised,
                    opacity: disabled ? 0.4 : 1,
                  },
                ]}
                onPress={() => !disabled && toggleAmbientSound(s.id)}
                activeOpacity={disabled ? 1 : 0.75}
                accessibilityLabel={`${s.label} sound${disabled ? ', coming soon' : ''}`}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={styles.soundChipIcon}>{s.icon}</Text>
                <Text style={[styles.soundChipLabel, { color: active ? '#fff' : t.textSecondary }]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.divider, { backgroundColor: t.borderSubtle }]} />

        {/* Volume chips */}
        <View style={styles.volumeRow}>
          <Text style={[styles.volumeRowLabel, { color: t.textPrimary }]}>Volume</Text>
          <View style={styles.volumeChips}>
            {VOLUME_STEPS.map((step) => {
              const active = ambientVolume === step.value;
              return (
                <TouchableOpacity
                  key={step.label}
                  style={[
                    styles.volumeChip,
                    { backgroundColor: active ? t.focusAccent : t.surfaceRaised },
                  ]}
                  onPress={() => setAmbientVolume(step.value)}
                  activeOpacity={0.75}
                  accessibilityLabel={`Volume ${step.label}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.volumeChipText, { color: active ? '#fff' : t.textSecondary }]}>
                    {step.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: t.borderSubtle }]} />

        <ToggleRow
          label="Play during breaks"
          description="Use focus ambience when no break sound is selected"
          value={playAmbientDuringBreak}
          onToggle={setPlayAmbientDuringBreak}
          accent={t.focusAccent}
          t={t}
        />

        <View style={[styles.divider, { backgroundColor: t.borderSubtle }]} />

        <Text style={[styles.ambientHint, { color: t.textMuted }]}>
          Break Sound
        </Text>

        <View style={styles.ambientPicker}>
          {BREAK_SOUNDS.map((s) => {
            const active = breakSound === s.id;
            const disabled = s.id !== 'none' && s.uri === null;
            return (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.soundChip,
                  {
                    backgroundColor: active ? t.focusAccent : t.surfaceRaised,
                    opacity: disabled ? 0.4 : 1,
                  },
                ]}
                onPress={() => !disabled && setBreakSound(s.id)}
                activeOpacity={disabled ? 1 : 0.75}
                accessibilityLabel={`${s.label} break sound${disabled ? ', coming soon' : ''}`}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={styles.soundChipIcon}>{s.icon}</Text>
                <Text style={[styles.soundChipLabel, { color: active ? '#fff' : t.textSecondary }]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Strict mode placeholder ── */}
      <Text style={[styles.sectionLabel, { color: t.textMuted }]}>Coming Later</Text>

      <View style={[styles.card, { backgroundColor: t.surface }]}>
        <View style={styles.comingSoonRow}>
          <View style={styles.comingSoonLeft}>
            <Text style={[styles.comingSoonLabel, { color: t.textDisabled }]}>
              Strict Focus Mode
            </Text>
            <Text style={[styles.comingSoonDesc, { color: t.textDisabled }]}>
              Optional mode to detect interruptions during focus sessions.
            </Text>
          </View>
          <View style={[styles.comingSoonBadge, { backgroundColor: t.surfaceRaised }]}>
            <Text style={[styles.comingSoonBadgeText, { color: t.textMuted }]}>Soon</Text>
          </View>
        </View>
      </View>

      {/* ── Privacy ── */}
      <Text style={[styles.sectionLabel, { color: t.textMuted }]}>Privacy</Text>

      <View style={[styles.card, { backgroundColor: t.surface }]}>
        <View style={styles.privacyBody}>
          <Text style={[styles.privacyLine, { color: t.textSecondary }]}>
            All data is stored locally on your device only.
          </Text>
          <Text style={[styles.privacyLine, { color: t.textMuted }]}>
            • No account required
          </Text>
          <Text style={[styles.privacyLine, { color: t.textMuted }]}>
            • No analytics or tracking
          </Text>
          <Text style={[styles.privacyLine, { color: t.textMuted }]}>
            • No data ever leaves your device
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: t.borderSubtle }]} />
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => router.push('/privacy')}
          activeOpacity={0.75}
          accessibilityLabel="Open privacy policy"
          accessibilityRole="button"
        >
          <View style={styles.linkLeft}>
            <Text style={[styles.linkLabel, { color: t.textPrimary }]}>Privacy Policy</Text>
            <Text style={[styles.linkDesc, { color: t.textMuted }]}>
              View what Focus Buddy stores and how it is used
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={t.textMuted} />
        </TouchableOpacity>
      </View>

      {/* ── Reset ── */}
      <Text style={[styles.sectionLabel, { color: t.textMuted }]}>Data</Text>

      <View style={[styles.card, { backgroundColor: t.surface }]}>
        <TouchableOpacity
          style={styles.resetRow}
          onPress={handleResetData}
          activeOpacity={0.7}
          accessibilityLabel="Reset all app data"
          accessibilityRole="button"
        >
          <View style={styles.resetLeft}>
            <Text style={[styles.resetLabel, { color: '#ef4444' }]}>Reset App Data</Text>
            <Text style={[styles.resetDesc, { color: t.textMuted }]}>
              Permanently delete all progress, companion, and sessions
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ── Goal stepper ─────────────────────────────────────────────────────────

function GoalStepper({
  label, description, value, suffix, onDecrease, onIncrease, t,
}: {
  label: string;
  description: string;
  value: number;
  suffix: string;
  onDecrease: () => void;
  onIncrease: () => void;
  t: AppTheme;
}) {
  return (
    <View style={styles.stepperRow}>
      <View style={styles.stepperLeft}>
        <Text style={[styles.stepperLabel, { color: t.textPrimary }]}>{label}</Text>
        <Text style={[styles.stepperDesc, { color: t.textMuted }]}>{description}</Text>
      </View>
      <View style={styles.stepperControls}>
        <TouchableOpacity
          style={[styles.stepperBtn, { backgroundColor: t.surfaceRaised }]}
          onPress={onDecrease}
          activeOpacity={0.7}
          hitSlop={8}
          accessibilityLabel={`Decrease ${label.toLowerCase()} goal`}
          accessibilityRole="button"
        >
          <Text style={[styles.stepperBtnText, { color: t.textPrimary }]}>−</Text>
        </TouchableOpacity>
        <Text style={[styles.stepperValue, { color: t.focusAccent }]}>
          {value}{suffix}
        </Text>
        <TouchableOpacity
          style={[styles.stepperBtn, { backgroundColor: t.surfaceRaised }]}
          onPress={onIncrease}
          activeOpacity={0.7}
          hitSlop={8}
          accessibilityLabel={`Increase ${label.toLowerCase()} goal`}
          accessibilityRole="button"
        >
          <Text style={[styles.stepperBtnText, { color: t.textPrimary }]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Toggle row ────────────────────────────────────────────────────────────

function ToggleRow({
  label, description, value, onToggle, accent, t,
}: {
  label: string;
  description: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  accent: string;
  t: AppTheme;
}) {
  return (
    <TouchableOpacity
      style={styles.toggleRow}
      onPress={() => onToggle(!value)}
      activeOpacity={0.7}
      accessibilityLabel={`${label}: ${value ? 'on' : 'off'}`}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <View style={styles.toggleLeft}>
        <Text style={[styles.toggleLabel, { color: t.textPrimary }]}>{label}</Text>
        <Text style={[styles.toggleDesc, { color: t.textMuted }]}>{description}</Text>
      </View>
      {/* Custom pill toggle — avoids system Switch inconsistency across themes */}
      <View style={[styles.pill, { backgroundColor: value ? accent : t.surfaceRaised }]}>
        <View style={[styles.pillThumb, { alignSelf: value ? 'flex-end' : 'flex-start' }]} />
      </View>
    </TouchableOpacity>
  );
}

// ── Theme card ────────────────────────────────────────────────────────────

function ThemeCard({
  theme, active, activeAccent, onPress,
}: {
  theme: AppTheme;
  active: boolean;
  activeAccent: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.themeCard,
        { backgroundColor: theme.surface, borderColor: active ? activeAccent : theme.border },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel={`${theme.name} theme${active ? ', selected' : ''}`}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      {active && (
        <View style={[styles.checkBadge, { backgroundColor: activeAccent }]}>
          <Text style={styles.checkText}>✓</Text>
        </View>
      )}
      <View style={[styles.preview, { backgroundColor: theme.bg }]}>
        <View style={[styles.swatch, { backgroundColor: theme.focusAccent }]} />
        <View style={[styles.swatch, { backgroundColor: theme.breakAccent }]} />
        <View style={[styles.swatch, { backgroundColor: theme.xpGold }]} />
      </View>
      <Text style={[styles.themeName, { color: active ? activeAccent : theme.textPrimary }]}>
        {theme.name}
      </Text>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: {
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 40,
    gap: 16,
  },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: { borderRadius: 20, overflow: 'hidden' },
  divider: { height: 1, marginHorizontal: 16 },
  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  toggleLeft: { flex: 1, gap: 2 },
  toggleLabel: { fontSize: 15, fontWeight: '500' },
  toggleDesc: { fontSize: 12 },
  pill: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 3,
    justifyContent: 'center',
  },
  pillThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  // Long break stepper
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  stepperLeft: { flex: 1, gap: 2 },
  stepperLabel: { fontSize: 15, fontWeight: '500' },
  stepperDesc: { fontSize: 12 },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: { fontSize: 18, fontWeight: '600', lineHeight: 22 },
  stepperValue: { fontSize: 16, fontWeight: '700', minWidth: 36, textAlign: 'center' },
  // Coming soon
  comingSoonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  comingSoonLeft: { flex: 1, gap: 4 },
  comingSoonLabel: { fontSize: 15, fontWeight: '500' },
  comingSoonDesc: { fontSize: 12 },
  comingSoonBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  comingSoonBadgeText: { fontSize: 11, fontWeight: '600' },
  // Privacy
  privacyBody: { paddingHorizontal: 16, paddingVertical: 14, gap: 6 },
  privacyLine: { fontSize: 13, lineHeight: 20 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  linkLeft: { flex: 1, gap: 2 },
  linkLabel: { fontSize: 15, fontWeight: '600' },
  linkDesc: { fontSize: 12 },
  // Reset
  resetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  resetLeft: { flex: 1, gap: 2 },
  resetLabel: { fontSize: 15, fontWeight: '600' },
  resetDesc: { fontSize: 12 },
  // Ambient sound
  ambientHint: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  ambientPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 16,
  },
  soundChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  soundChipIcon: { fontSize: 16 },
  soundChipLabel: { fontSize: 13, fontWeight: '600' },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  volumeRowLabel: { fontSize: 15, fontWeight: '500', flex: 1 },
  volumeChips: { flexDirection: 'row', gap: 8 },
  volumeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  volumeChipText: { fontSize: 13, fontWeight: '600' },
  // Theme grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  themeCard: {
    width: '47%',
    borderRadius: 18,
    borderWidth: 2,
    padding: 16,
    gap: 12,
    overflow: 'hidden',
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  checkText: { fontSize: 13, fontWeight: '700' },
  preview: { flexDirection: 'row', gap: 6, borderRadius: 10, padding: 12 },
  swatch: { flex: 1, borderRadius: 6 },
  themeName: { fontSize: 14, fontWeight: '700' },
});
