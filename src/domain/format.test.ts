import {
  backupIsStale,
  calendarDaysBetween,
  describeCounts,
  formatClock,
  formatDate,
  formatDateTime,
  formatDaysAgo,
  formatDuration,
  formatSet,
  formatWeight,
  groupByMonth,
} from './format';
import { toUnix } from './time';

const at = (y: number, m: number, d: number, h = 12, min = 0) => toUnix(new Date(y, m - 1, d, h, min));

describe('formatDateTime', () => {
  it('formats local time with zero-padded hours and minutes', () => {
    expect(formatDateTime(at(2026, 10, 20, 7, 5))).toBe('20 Oct 2026, 07:05');
  });
});

describe('calendar days', () => {
  it('counts calendar days, not 24-hour periods', () => {
    expect(calendarDaysBetween(at(2026, 10, 20, 23, 50), at(2026, 10, 21, 0, 10))).toBe(1);
    expect(calendarDaysBetween(at(2026, 10, 20, 0, 10), at(2026, 10, 20, 23, 50))).toBe(0);
  });

  it('describes ages in words', () => {
    const now = at(2026, 10, 20);
    expect(formatDaysAgo(at(2026, 10, 20, 8), now)).toBe('today');
    expect(formatDaysAgo(at(2026, 10, 19), now)).toBe('yesterday');
    expect(formatDaysAgo(at(2026, 10, 13), now)).toBe('7 days ago');
  });
});

describe('backupIsStale', () => {
  const now = at(2026, 10, 20);
  it('is stale when there has never been a backup', () => {
    expect(backupIsStale(null, now)).toBe(true);
  });
  it('is stale from 7 calendar days', () => {
    expect(backupIsStale(at(2026, 10, 14), now)).toBe(false);
    expect(backupIsStale(at(2026, 10, 13), now)).toBe(true);
  });
});

describe('weights, sets and clock times', () => {
  it('formats weights without float noise or trailing zeros', () => {
    expect(formatWeight(60)).toBe('60');
    expect(formatWeight(62.5)).toBe('62.5');
    expect(formatWeight(0.1 + 0.2)).toBe('0.3');
  });

  it('formats a set as weight × reps', () => {
    expect(formatSet(62.5, 6)).toBe('62.5 × 6');
  });

  it('formats a clock time with zero padding', () => {
    expect(formatClock(at(2026, 10, 20, 7, 5))).toBe('07:05');
  });
});

describe('dates, months and durations', () => {
  it('formats a date with weekday', () => {
    expect(formatDate(at(2026, 10, 20, 17, 5))).toBe('Tue 20 Oct 2026');
  });

  it('formats durations', () => {
    expect(formatDuration(30)).toBe('under 1 min');
    expect(formatDuration(45 * 60 + 59)).toBe('45 min');
    expect(formatDuration(65 * 60)).toBe('1 h 05 min');
    expect(formatDuration(-10)).toBe('under 1 min');
  });

  it('groups newest-first items into month sections', () => {
    const items = [at(2026, 10, 20), at(2026, 10, 2), at(2026, 9, 28), at(2025, 10, 5)];
    expect(groupByMonth(items, (t) => t).map((s) => [s.title, s.data.length])).toEqual([
      ['October 2026', 2],
      ['September 2026', 1],
      ['October 2025', 1],
    ]);
    expect(groupByMonth([], (t: number) => t)).toEqual([]);
  });
});

describe('describeCounts', () => {
  it('uses singular and plural correctly', () => {
    expect(describeCounts({ exercises: 32, workouts: 1, sets: 0, splits: 1 })).toBe('32 exercises · 1 workout · 0 sets · 1 split');
  });
});
