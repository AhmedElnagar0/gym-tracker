import type { BackupCounts } from './backup-format';
import { fromUnix } from './time';

// Display formatting. Done by hand (not Intl) so output is the same on the phone and in tests.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');

/** "20 Oct 2026, 17:05", in local time. */
export function formatDateTime(unix: number): string {
  const d = fromUnix(unix);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Whole calendar days between two moments, in local time (not 24-hour periods). */
export function calendarDaysBetween(earlier: number, later: number): number {
  const a = fromUnix(earlier);
  const b = fromUnix(later);
  const dayA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const dayB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((dayB - dayA) / 86_400_000);
}

/** "today", "yesterday", "3 days ago". */
export function formatDaysAgo(then: number, now: number): string {
  const days = calendarDaysBetween(then, now);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "Tue 20 Oct 2026", in local time. */
export function formatDate(unix: number): string {
  const d = fromUnix(unix);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "October 2026", in local time. */
export function formatMonth(unix: number): string {
  const d = fromUnix(unix);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

/** "45 min", "1 h 05 min", "under 1 min". */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  if (minutes < 1) return 'under 1 min';
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${pad(minutes % 60)} min`;
}

/**
 * Splits items (already sorted newest first) into consecutive month sections,
 * e.g. [{ title: "October 2026", data: [...] }, { title: "September 2026", … }].
 */
export function groupByMonth<T>(items: readonly T[], timeOf: (item: T) => number): { title: string; data: T[] }[] {
  const sections: { title: string; data: T[] }[] = [];
  for (const item of items) {
    const title = formatMonth(timeOf(item));
    const current = sections.at(-1);
    if (current && current.title === title) current.data.push(item);
    else sections.push({ title, data: [item] });
  }
  return sections;
}

/** "17:05", in local time. */
export function formatClock(unix: number): string {
  const d = fromUnix(unix);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** A weight without float noise or trailing zeros: 60 → "60", 62.5 → "62.5". */
export function formatWeight(kg: number): string {
  return String(Math.round(kg * 100) / 100);
}

/** "60 × 8". */
export function formatSet(weightKg: number, reps: number): string {
  return `${formatWeight(weightKg)} × ${reps}`;
}

/** "1 set", "3 sets". */
export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "32 exercises · 4 workouts · 61 sets · 1 split". */
export function describeCounts(c: BackupCounts): string {
  return [plural(c.exercises, 'exercise'), plural(c.workouts, 'workout'), plural(c.sets, 'set'), plural(c.splits, 'split')].join(
    ' · ',
  );
}

/** A backup reminder shows when there's none, or the last is this many days old. */
export const BACKUP_STALE_DAYS = 7;

export function backupIsStale(lastExport: number | null, now: number): boolean {
  return lastExport === null || calendarDaysBetween(lastExport, now) >= BACKUP_STALE_DAYS;
}
