import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useStatsStore } from '../../store/statsStore';
import { useCompanionStore } from '../../store/companionStore';
import { useSessionHistoryStore, SessionHistoryEntry } from '../../store/sessionHistoryStore';
import { useTheme } from '../../hooks/useTheme';
import { AppTheme } from '../../constants/colors';
import SessionBanner from '../../components/SessionBanner';
import { getCurrentMonthDays, getLast7Days, getTagTotals } from '../../utils/gameLogic';
import { getLocalDateKey } from '../../utils/date';
import { getTodayFocusMinutes, goalProgress } from '../../utils/sessionStats';
import { useGoalStore } from '../../store/goalStore';
import { getAchievements, Achievement } from '../../utils/achievements';
import { SESSION_TAGS, SessionTag } from '../../constants/sessionTags';
import { computeInsights, Insight } from '../../utils/insights';
import ShareStatsCard from '../../components/ShareStatsCard';

const BAR_MAX_HEIGHT = 72;
const FILTERED_SESSION_COUNT = 50;

// ── Screen ────────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const t = useTheme();
  const [selectedTag, setSelectedTag] = useState<SessionTag | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<View>(null);
  const {
    totalSessions,
    todaySessions,
    totalFocusMinutes,
    currentStreak,
    bestStreak,
    longBreaksCompleted,
    unlockedAchievements,
  } = useStatsStore();
  const { name, level, xp, evolutionStage, petDates } = useCompanionStore();
  const { entries } = useSessionHistoryStore();
  const { dailySessionGoal, dailyMinuteGoal } = useGoalStore();

  const hours = Math.floor(totalFocusMinutes / 60);
  const mins = totalFocusMinutes % 60;
  const focusTime = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  const sevenDays = getLast7Days(entries);
  const maxMinutes = Math.max(...sevenDays.map((d) => d.minutes), 1);
  const filteredSessions = (selectedTag
    ? entries.filter((e) => e.tag === selectedTag)
    : entries
  ).slice(0, FILTERED_SESSION_COUNT);
  const todayStr = getLocalDateKey();
  const todayFocusMinutes = getTodayFocusMinutes(entries, todayStr);
  const sessionGoalProgress = goalProgress(todaySessions, dailySessionGoal);
  const minuteGoalProgress = goalProgress(todayFocusMinutes, dailyMinuteGoal);
  const monthDays = getCurrentMonthDays(entries);
  const maxMonthMinutes = Math.max(...monthDays.map((d) => d.minutes), 1);
  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const tagTotals = Object.entries(getTagTotals(entries)).sort((a, b) => b[1] - a[1]);
  const maxTagMinutes = Math.max(...tagTotals.map(([, minutes]) => minutes), 1);
  const insights = computeInsights(entries);
  const achievements = getAchievements({
    totalSessions,
    currentStreak,
    bestStreak,
    totalFocusMinutes,
    longBreaksCompleted,
    petDays: petDates.length,
    unlockedIds: unlockedAchievements,
  });

  async function handleShare() {
    setSharing(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your Focus Buddy stats' });
    } catch {}
    setSharing(false);
    setShowShareModal(false);
  }

  return (
    <>
    <ScrollView
      style={[styles.scroll, { backgroundColor: t.bg }]}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="light-content" backgroundColor={t.bg} />

      <SessionBanner />

      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: t.textPrimary }]}>Your Stats</Text>
        <TouchableOpacity
          style={[styles.shareBtn, { backgroundColor: t.surface }]}
          onPress={() => setShowShareModal(true)}
          activeOpacity={0.75}
          accessibilityLabel="Share your stats"
          accessibilityRole="button"
        >
          <Text style={[styles.shareBtnText, { color: t.focusAccent }]}>Share</Text>
        </TouchableOpacity>
      </View>

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

      {insights.length > 0 && (
        <Section title="Focus Insights" t={t}>
          {insights.map((insight) => (
            <InsightRow key={insight.label} insight={insight} t={t} />
          ))}
        </Section>
      )}

      <Section title="Daily Goals" t={t}>
        <GoalRow
          label="Sessions"
          value={`${todaySessions}/${dailySessionGoal}`}
          progress={sessionGoalProgress}
          accent={t.today}
          t={t}
        />
        <GoalRow
          label="Focus minutes"
          value={`${todayFocusMinutes}/${dailyMinuteGoal}m`}
          progress={minuteGoalProgress}
          accent={t.focusAccent}
          t={t}
        />
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

      <Section title={monthLabel} t={t}>
        <View style={styles.weekHeader}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <Text key={`${day}-${index}`} style={[styles.weekLabel, { color: t.textMuted }]}>
              {day}
            </Text>
          ))}
        </View>
        <View style={styles.monthGrid}>
          {Array.from({ length: new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay() }).map((_, index) => (
            <View key={`empty-${index}`} style={styles.monthCell} />
          ))}
          {monthDays.map((day) => {
            const intensity = day.minutes === 0 ? 0 : Math.max(0.25, day.minutes / maxMonthMinutes);
            const isToday = day.date === todayStr;
            return (
              <View
                key={day.date}
                style={[
                  styles.monthCell,
                  {
                    backgroundColor: day.minutes > 0 ? t.focusAccent + Math.round(30 + intensity * 120).toString(16).padStart(2, '0') : t.surfaceRaised,
                    borderColor: isToday ? t.focusAccent : 'transparent',
                  },
                ]}
              >
                <Text style={[styles.monthDayText, { color: isToday ? t.focusAccent : t.textMuted }]}>
                  {day.dayOfMonth}
                </Text>
              </View>
            );
          })}
        </View>
      </Section>

      <Section title="Focus Tags" t={t}>
        {tagTotals.length === 0 ? (
          <Text style={[styles.emptyChart, { color: t.textMuted }]}>No tagged sessions yet</Text>
        ) : (
          tagTotals.map(([tag, minutes]) => (
            <TagRow
              key={tag}
              tag={tag}
              minutes={minutes}
              progress={minutes / maxTagMinutes}
              t={t}
            />
          ))
        )}
      </Section>

      <Section title="Achievements" t={t}>
        {achievements.map((achievement) => (
          <AchievementRow key={achievement.id} achievement={achievement} t={t} />
        ))}
      </Section>

      {/* ── Session history with tag filter ── */}
      {entries.length > 0 && (
        <Section title="Sessions" t={t}>
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterChip, { backgroundColor: selectedTag === null ? t.focusAccent : t.surfaceRaised, borderColor: selectedTag === null ? t.focusAccent : t.border }]}
              onPress={() => setSelectedTag(null)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, { color: selectedTag === null ? '#fff' : t.textSecondary }]}>All</Text>
            </TouchableOpacity>
            {SESSION_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[styles.filterChip, { backgroundColor: selectedTag === tag ? t.focusAccent : t.surfaceRaised, borderColor: selectedTag === tag ? t.focusAccent : t.border }]}
                onPress={() => setSelectedTag(selectedTag === tag ? null : tag)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, { color: selectedTag === tag ? '#fff' : t.textSecondary }]}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {filteredSessions.length === 0 ? (
            <Text style={[styles.emptyChart, { color: t.textMuted }]}>No sessions for this tag</Text>
          ) : (
            filteredSessions.map((entry) => (
              <SessionRow key={entry.id} entry={entry} t={t} />
            ))
          )}
        </Section>
      )}
    </ScrollView>

    {/* ── Share modal ── */}
    <Modal visible={showShareModal} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: t.surface }]}>
          <Text style={[styles.modalTitle, { color: t.textPrimary }]}>Share your progress</Text>

          {/* Card preview */}
          <View style={styles.cardPreview}>
            <ShareStatsCard
              ref={cardRef}
              name={name}
              evolutionStage={evolutionStage}
              level={level}
              currentStreak={currentStreak}
              bestStreak={bestStreak}
              totalSessions={totalSessions}
              totalFocusMinutes={totalFocusMinutes}
            />
          </View>

          <TouchableOpacity
            style={[styles.modalShareBtn, { backgroundColor: t.focusAccent }]}
            onPress={handleShare}
            activeOpacity={0.85}
            disabled={sharing}
          >
            {sharing
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.modalShareBtnText}>Share Image</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modalCloseBtn, { borderColor: t.border }]}
            onPress={() => setShowShareModal(false)}
            activeOpacity={0.75}
          >
            <Text style={[styles.modalCloseBtnText, { color: t.textSecondary }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    </>
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
        <Text style={[styles.sessionTag, { color: t.focusAccent }]}>{entry.tag ?? 'Work'}</Text>
      </View>
      <Text style={[styles.sessionDuration, { color: t.focusAccent }]}>
        {entry.durationMinutes} min
      </Text>
    </View>
  );
}

function GoalRow({
  label, value, progress, accent, t,
}: {
  label: string;
  value: string;
  progress: number;
  accent: string;
  t: AppTheme;
}) {
  return (
    <View style={styles.goalRow}>
      <View style={styles.goalHeader}>
        <Text style={[styles.goalLabel, { color: t.textSecondary }]}>{label}</Text>
        <Text style={[styles.goalValue, { color: t.textMuted }]}>{value}</Text>
      </View>
      <View style={[styles.goalTrack, { backgroundColor: t.surfaceRaised }]}>
        <View style={[styles.goalFill, { width: `${progress * 100}%`, backgroundColor: accent }]} />
      </View>
    </View>
  );
}

function TagRow({
  tag, minutes, progress, t,
}: {
  tag: string;
  minutes: number;
  progress: number;
  t: AppTheme;
}) {
  return (
    <View style={styles.tagRow}>
      <View style={styles.tagHeader}>
        <Text style={[styles.tagName, { color: t.textSecondary }]}>{tag}</Text>
        <Text style={[styles.tagMinutes, { color: t.textMuted }]}>{minutes}m</Text>
      </View>
      <View style={[styles.goalTrack, { backgroundColor: t.surfaceRaised }]}>
        <View style={[styles.goalFill, { width: `${progress * 100}%`, backgroundColor: t.focusAccent }]} />
      </View>
    </View>
  );
}

function InsightRow({ insight, t }: { insight: Insight; t: AppTheme }) {
  return (
    <View style={[styles.insightRow, { borderBottomColor: t.borderSubtle }]}>
      <Text style={styles.insightIcon}>{insight.icon}</Text>
      <View style={styles.insightBody}>
        <Text style={[styles.insightLabel, { color: t.textMuted }]}>{insight.label}</Text>
        <Text style={[styles.insightValue, { color: t.textPrimary }]}>{insight.value}</Text>
        <Text style={[styles.insightSub, { color: t.textMuted }]}>{insight.sub}</Text>
      </View>
    </View>
  );
}

function AchievementRow({ achievement, t }: { achievement: Achievement; t: AppTheme }) {
  const progress = achievement.target === 0 ? 1 : achievement.progress / achievement.target;
  return (
    <View style={[styles.achievementRow, { borderBottomColor: t.borderSubtle }]}>
      <Text style={styles.achievementIcon}>{achievement.icon}</Text>
      <View style={styles.achievementBody}>
        <View style={styles.achievementHeader}>
          <Text style={[styles.achievementTitle, { color: t.textPrimary }]}>{achievement.title}</Text>
          <Text style={[styles.achievementProgress, { color: achievement.unlocked ? t.xpGold : t.textMuted }]}>
            {achievement.unlocked ? 'Done' : `${achievement.progress}/${achievement.target}`}
          </Text>
        </View>
        <Text style={[styles.achievementDesc, { color: t.textMuted }]}>{achievement.description}</Text>
        {!achievement.unlocked && (
          <View style={[styles.goalTrack, { backgroundColor: t.surfaceRaised }]}>
            <View style={[styles.goalFill, { width: `${progress * 100}%`, backgroundColor: t.xpGold }]} />
          </View>
        )}
      </View>
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
  goalRow: { gap: 6, paddingVertical: 6 },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  goalLabel: { fontSize: 14, fontWeight: '600' },
  goalValue: { fontSize: 13, fontWeight: '700' },
  goalTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  goalFill: { height: '100%', borderRadius: 4 },
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
  // Month heatmap
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  weekLabel: {
    width: '13.2%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  monthCell: {
    width: '13.2%',
    aspectRatio: 1,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthDayText: {
    fontSize: 10,
    fontWeight: '700',
  },
  // Tags
  tagRow: {
    gap: 6,
    paddingVertical: 7,
  },
  tagHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  tagName: { fontSize: 14, fontWeight: '600' },
  tagMinutes: { fontSize: 13, fontWeight: '700' },
  // Achievements
  achievementRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  achievementIcon: {
    fontSize: 20,
    width: 28,
  },
  achievementBody: {
    flex: 1,
    gap: 5,
  },
  achievementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  achievementTitle: { fontSize: 14, fontWeight: '700' },
  achievementProgress: { fontSize: 12, fontWeight: '700' },
  achievementDesc: { fontSize: 12, lineHeight: 16 },
  // Session filter
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Insights
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 12,
  },
  insightIcon: { fontSize: 20, width: 28 },
  insightBody: { flex: 1, gap: 2 },
  insightLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  insightValue: { fontSize: 16, fontWeight: '700' },
  insightSub: { fontSize: 12 },
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
  sessionTag: { fontSize: 11, fontWeight: '700' },
  sessionDuration: { fontSize: 14, fontWeight: '700' },
  // Share
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  shareBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  shareBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardPreview: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  modalShareBtn: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalShareBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  modalCloseBtn: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  modalCloseBtnText: {
    fontWeight: '600',
    fontSize: 15,
  },
});
