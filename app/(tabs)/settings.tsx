import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar, Alert } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useThemeStore } from '../../store/themeStore';
import { useSessionStore } from '../../store/sessionStore';
import { useSettingsStore } from '../../store/settingsStore';
import { THEME_LIST, ThemeId, AppTheme } from '../../constants/colors';
import { LONG_BREAK_MINUTES_MIN, LONG_BREAK_MINUTES_MAX } from '../../constants/game';
import { resetAllAppData } from '../../utils/resetAppData';

export default function SettingsScreen() {
  const t = useTheme();
  const { activeThemeId, setTheme } = useThemeStore();
  const { selectedLongBreakMinutes, setLongBreakMinutes } = useSessionStore();
  const { soundEnabled, hapticsEnabled, keepAwakeEnabled,
          setSoundEnabled, setHapticsEnabled, setKeepAwakeEnabled } = useSettingsStore();

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

      {/* ── Strict mode placeholder (item 7) — no behavior yet ── */}
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
