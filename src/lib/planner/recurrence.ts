// Simple recurrence engine — a deliberate RFC 5545 subset kept small
// enough to reason about: FREQ daily/weekly/monthly/yearly, INTERVAL,
// BYDAY (weekly), UNTIL, COUNT. Completing an occurrence spawns the
// next one (tasksApi), so history is never rewritten by rule edits.
import { addDays, addMonths, addYears, format, getDay, isAfter, parseISO } from 'date-fns';
import type { Recurrence } from './types';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function normalizeRecurrence(r: Recurrence): Recurrence {
  const out: Recurrence = { freq: r.freq, interval: Math.max(1, Math.floor(r.interval ?? 1)) };
  if (r.freq === 'weekly' && r.byweekday?.length) {
    out.byweekday = [...new Set(r.byweekday)].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b);
  }
  if (r.until) out.until = r.until;
  if (r.count && r.count > 0) out.count = Math.floor(r.count);
  return out;
}

/**
 * Next occurrence strictly after `after` (a YYYY-MM-DD date string).
 * `occurrenceIndex` is how many occurrences the series has already
 * produced (used against `count`). Returns null when the series is done.
 */
export function nextOccurrence(
  rule: Recurrence,
  after: string,
  occurrenceIndex: number,
): string | null {
  const r = normalizeRecurrence(rule);
  if (r.count !== undefined && occurrenceIndex >= r.count - 1) return null;

  const afterDate = parseISO(after);
  if (isNaN(afterDate.getTime())) return null;
  const interval = r.interval ?? 1;
  let next: Date;

  switch (r.freq) {
    case 'daily':
      next = addDays(afterDate, interval);
      break;
    case 'weekly': {
      if (r.byweekday?.length) {
        // scan forward day by day (bounded: at most 7 * interval + 7)
        next = addDays(afterDate, 1);
        let guard = 7 * interval + 7;
        while (guard-- > 0 && !r.byweekday.includes(getDay(next))) {
          next = addDays(next, 1);
        }
        if (guard <= 0 && !r.byweekday.includes(getDay(next))) return null;
      } else {
        next = addDays(afterDate, 7 * interval);
      }
      break;
    }
    case 'monthly':
      next = addMonths(afterDate, interval);
      break;
    case 'yearly':
      next = addYears(afterDate, interval);
      break;
    default:
      return null;
  }

  if (r.until) {
    const until = parseISO(r.until);
    if (!isNaN(until.getTime()) && isAfter(next, until)) return null;
  }
  return format(next, 'yyyy-MM-dd');
}

export function describeRecurrence(rule: Recurrence): string {
  const r = normalizeRecurrence(rule);
  const interval = r.interval ?? 1;
  const every = (unit: string) => (interval === 1 ? `Every ${unit}` : `Every ${interval} ${unit}s`);
  let base: string;
  switch (r.freq) {
    case 'daily': base = every('day'); break;
    case 'weekly': {
      if (r.byweekday?.length === 5 && r.byweekday.every((d) => d >= 1 && d <= 5)) {
        base = 'Every weekday';
      } else if (r.byweekday?.length) {
        base = `${every('week')} on ${r.byweekday.map((d) => DAY_NAMES[d]).join(', ')}`;
      } else {
        base = every('week');
      }
      break;
    }
    case 'monthly': base = every('month'); break;
    case 'yearly': base = every('year'); break;
  }
  if (r.until) base += ` until ${r.until}`;
  if (r.count) base += `, ${r.count} times`;
  return base;
}

export const WEEKDAYS_MON_FRI = [1, 2, 3, 4, 5];
