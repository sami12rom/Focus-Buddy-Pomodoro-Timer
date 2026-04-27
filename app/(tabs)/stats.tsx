import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { useStatsStore } from '../../store/statsStore';
import { useCompanionStore } from '../../store/companionStore';
import { useSessionHistoryStore, SessionHistoryEntry } from '../../store/sessionHistoryStore';
import { useTheme } from '../../hooks/useTheme';
import { AppTheme } from '../../constants/colors';
import SessionBanner from '../../components/SessionBanner';
import { getLast7Days } from '../../utils/gameLogic';

const BAR_MAX_HEIGHT = 72;
const RECENT_SESSION_COUNT = 10;

// ── Screen ────────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const t = useTheme();
  const { totalSessions, todaySessions, totalFocusMinutes, currentStreak, bestStreak } = useStatsStore();
  const { level, xp } = useCompanionStore();
  const { entries } = useSessionHistoryStore();

  const hours = Math.floor(totalFocusMinutes / 60);
  const mins = totalFocusMinutes % 60;
  const focusTime = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  const sevenDays = getLast7Days(entries);
  const maxMinutes = Math.max(...sevenDays.map((d) => d.minutes), 1);
  const recentSessions = entries.slice(0, RECENT_SESSION_COUNT);
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: t.bg }]}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="light-content" backgroundColor={t.bg} />

      <SessionBanner />

      <Text style={[styles.title, { color: t.textPrimary }]}>Your Stats</Text>

      {/* ── Summary stats ── */}
      <Section title="Focus Sessions" t={t}>
        <StatRow icon="✅" label="Total sessions"   value={String(totalSessions)}                     t={t} />
        <StatRow icon="📅" label="Today"            value={String(todaySessions)}                     t={t} />
        <StatRow icon="⏱️" label="Total focus time" value={totalFocusMinutes > 0 ? focusTime : '0m'} t={t} />
      </Section>

      <Section title="Streaks" t={t}>
        <StatRow icon="🔥" label="Current streak" value={`${currentStreak} days`} highlight t={t} />
        <StatRow icon="🏆" label="Best streak"    value={`${bestStreak} days`}               t={t} />
      </Section>

      <Section title="Companion" t={t}>
        <StatRow icon="⭐" label="Level"           value={String(level)} t={t} />
        <StatRow icon="⚡" label="Total XP earned" value={String(xp)}   t={t} />
      </Section>

      {/* ── Last 7 days bar chart ── */}
      <Section title="Last 7 Days" t={t}>
        {sevenDays.every((d) => d.minutes === 0) ? (
          <Text style={[styles.emptyChart, { color: t.textMuted }]}>No sessions in the last 7 days</Text>
        ) : (
          <View style={styles.chartRow}>
            {sevenDays.map((day) => {
              const barHeight = Math.max(4, (day.minutes / maxMinutes) * BAR_MAX_HEIGHT);
              const isToday = day.date === todayStr;
              return (
                <View key={day.date} style={styles.chartCol}>
                  {day.minutes > 0 && (
                    <Text style={[styles.barMinutes, { color: t.textMuted }]}>{day.minutes}m</Text>
                  )}
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.bar,
                        { height: barHeight, backgroundColor: isToday ? t.focusAccent : t.focusAccent + '55' },
                      ]}
                    />
                  </View>
                  <Text style={[styles.dayLabel, { color: isToday ? t.focusAccent : t.textMuted }]}>
                    {day.label}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </Section>

      {/* ── Recent sessions list ── */}
      {recentSessions.length > 0 && (
        <Section title="Recent Sessions" t={t}>
          {recentSessions.map((entry) => (
            <SessionRow key={entry.id} entry={entry} t={t} />
          ))}
        </Section>
      )}
    </ScrollView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function Section({ title, children, t }: { title: string; children: React.ReactNode; t: AppTheme }) {
  return (
    <View style={[styles.section, { backgroundColor: t.surface }]}>
      <Text style={[styles.sectionTitle, { color: t.textMuted }]}>{title}</Text>
      {children}
    </View>
  );
}

function StatRow({
  icon, label, value, highlight, t,
}: {
  icon: string; label: string; value: string; highlight?: boolean; t: AppTheme;
}) {
  return (
    <View style={[styles.row, { borderBottomColor: t.borderSubtle }]}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <Text style={[styles.rowLabel, { color: t.textSecondary }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: highlight ? t.streak : t.textPrimary }]}>{value}</Text>
    </View>
  );
}

function SessionRow({ entry, t }: { entry: SessionHistoryEntry; t: AppTheme }) {
  const dateLabel = new Date(entry.completedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });
  return (
    <View style={[styles.sessionRow, { borderBottomColor: t.borderSubtle }]}>
      <View style={styles.sessionLeft}>
        <Text style={[styles.sessionTask, { color: t.textPrimary }]}>
          {entry.task || 'No task'}
        </Text>
        <Text style={[styles.sessionDate, { color: t.textMuted }]}>{dateLabel}</Text>
      </View>
      <Text style={[styles.sessionDuration, { color: t.focusAccent }]}>
        {entry.durationMinutes} min
      </Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: {
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 40,
    gap: 24,
  },
  title: { fontSize: 28, fontWeight: '700' },
  section: { borderRadius: 20, padding: 20, gap: 4 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 12,
  },
  rowIcon: { fontSize: 18, width: 28 },
  rowLabel: { flex: 1, fontSize: 15 },
  rowValue: { fontSize: 16, fontWeight: '600' },
  // 7-day chart
  emptyChart: { fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 4,
    gap: 4,
  },
  chartCol: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: {
    height: BAR_MAX_HEIGHT,
    justifyContent: 'flex-end',
    width: '100%',
    alignItems: 'center',
  },
  bar: { width: '70%', borderRadius: 4, minHeight: 4 },
  barMinutes: { fontSize: 9, fontWeight: '600' },
  dayLabel: { fontSize: 11, fontWeight: '600' },
  // Recent sessions
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 12,
  },
  sessionLeft: { flex: 1, gap: 2 },
  sessionTask: { fontSize: 14, fontWeight: '500' },
  sessionDate: { fontSize: 12 },
  sessionDuration: { fontSize: 14, fontWeight: '700' },
});
