import { SessionHistoryEntry } from '../store/sessionHistoryStore';
import { getLocalDateKey, addDaysToLocalDateKey } from './date';

export interface Insight {
  icon: string;
  label: string;
  value: string;
  sub: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseDow(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).getDay();
}

export function computeInsights(entries: SessionHistoryEntry[]): Insight[] {
  if (entries.length < 3) return [];

  const insights: Insight[] = [];

  // Most productive day of week
  const minutesByDow: Record<number, number> = {};
  for (const e of entries) {
    const dow = parseDow(e.date);
    minutesByDow[dow] = (minutesByDow[dow] ?? 0) + e.durationMinutes;
  }
  const bestDow = Object.entries(minutesByDow).reduce<number>(
    (best, [dow, mins]) => (mins > (minutesByDow[best] ?? 0) ? Number(dow) : best),
    Number(Object.keys(minutesByDow)[0]),
  );
  insights.push({
    icon: '📅',
    label: 'Most productive day',
    value: DAY_NAMES[bestDow],
    sub: `${minutesByDow[bestDow]}m total focus`,
  });

  // Peak time of day
  const timeBuckets: Record<string, number> = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 };
  for (const e of entries) {
    const hour = new Date(e.completedAt).getHours();
    if (hour >= 5 && hour < 12) timeBuckets['Morning'] += e.durationMinutes;
    else if (hour >= 12 && hour < 17) timeBuckets['Afternoon'] += e.durationMinutes;
    else if (hour >= 17 && hour < 21) timeBuckets['Evening'] += e.durationMinutes;
    else timeBuckets['Night'] += e.durationMinutes;
  }
  const peakTime = Object.entries(timeBuckets).reduce(
    (best, [k, v]) => (v > timeBuckets[best] ? k : best),
    'Morning',
  );
  const timeIcons: Record<string, string> = { Morning: '🌅', Afternoon: '☀️', Evening: '🌆', Night: '🌙' };
  insights.push({
    icon: timeIcons[peakTime],
    label: 'Peak focus time',
    value: peakTime,
    sub: `${timeBuckets[peakTime]}m of focus`,
  });

  // Consistency over last 14 days
  const entryDates = new Set(entries.map((e) => e.date));
  const today = getLocalDateKey();
  let activeLast14 = 0;
  for (let i = 0; i < 14; i++) {
    if (entryDates.has(addDaysToLocalDateKey(today, -i))) activeLast14++;
  }
  const consistencyPct = Math.round((activeLast14 / 14) * 100);
  insights.push({
    icon: '📊',
    label: 'Consistency (14 days)',
    value: `${consistencyPct}%`,
    sub: `${activeLast14} of 14 days active`,
  });

  // Average session length
  const avgDuration = Math.round(
    entries.reduce((s, e) => s + e.durationMinutes, 0) / entries.length,
  );
  insights.push({
    icon: '⌛',
    label: 'Avg session length',
    value: `${avgDuration} min`,
    sub: `across ${entries.length} sessions`,
  });

  // Weekday vs weekend avg minutes per day
  const weekdayMinsMap: Record<string, number> = {};
  const weekendMinsMap: Record<string, number> = {};
  for (const e of entries) {
    const dow = parseDow(e.date);
    const isWeekend = dow === 0 || dow === 6;
    if (isWeekend) {
      weekendMinsMap[e.date] = (weekendMinsMap[e.date] ?? 0) + e.durationMinutes;
    } else {
      weekdayMinsMap[e.date] = (weekdayMinsMap[e.date] ?? 0) + e.durationMinutes;
    }
  }
  const weekdayDays = Object.keys(weekdayMinsMap).length;
  const weekendDays = Object.keys(weekendMinsMap).length;
  if (weekdayDays > 0 && weekendDays > 0) {
    const avgWeekday = Math.round(
      Object.values(weekdayMinsMap).reduce((s, v) => s + v, 0) / weekdayDays,
    );
    const avgWeekend = Math.round(
      Object.values(weekendMinsMap).reduce((s, v) => s + v, 0) / weekendDays,
    );
    insights.push({
      icon: avgWeekday >= avgWeekend ? '💼' : '🌴',
      label: 'Weekday vs weekend',
      value: avgWeekday >= avgWeekend ? 'Weekdays win' : 'Weekends win',
      sub: `${avgWeekday}m weekday · ${avgWeekend}m weekend avg`,
    });
  }

  return insights;
}
