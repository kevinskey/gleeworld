// Stable period keys for calendar notes. One note per (user, type, key);
// notes are created lazily when a period is first opened.
//
//   daily      2026-10-17
//   weekly     2026-W42        (ISO week; week starts Monday)
//   monthly    2026-10
//   quarterly  2026-Q4
//   yearly     2026
import {
  addDays, addMonths, addQuarters, addWeeks, addYears,
  endOfISOWeek, endOfMonth, endOfQuarter, endOfYear,
  format, getISOWeek, getISOWeekYear, getQuarter,
  parse, setISOWeek, startOfISOWeek, startOfMonth, startOfQuarter, startOfYear,
} from 'date-fns';
import type { NoteType } from './types';

export type PeriodType = Exclude<NoteType, 'note'>;

export const PERIOD_TYPES: PeriodType[] = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];

export function periodKey(date: Date, type: PeriodType): string {
  switch (type) {
    case 'daily': return format(date, 'yyyy-MM-dd');
    case 'weekly': return `${getISOWeekYear(date)}-W${String(getISOWeek(date)).padStart(2, '0')}`;
    case 'monthly': return format(date, 'yyyy-MM');
    case 'quarterly': return `${format(date, 'yyyy')}-Q${getQuarter(date)}`;
    case 'yearly': return format(date, 'yyyy');
  }
}

const KEY_PATTERNS: Record<PeriodType, RegExp> = {
  daily: /^(\d{4})-(\d{2})-(\d{2})$/,
  weekly: /^(\d{4})-W(\d{2})$/,
  monthly: /^(\d{4})-(\d{2})$/,
  quarterly: /^(\d{4})-Q([1-4])$/,
  yearly: /^(\d{4})$/,
};

export function typeOfKey(key: string): PeriodType | null {
  for (const type of PERIOD_TYPES) {
    if (KEY_PATTERNS[type].test(key)) return type;
  }
  return null;
}

/** Start-of-period Date for a key, or null if malformed. */
export function keyToDate(key: string, type: PeriodType): Date | null {
  const m = KEY_PATTERNS[type].exec(key);
  if (!m) return null;
  const year = Number(m[1]);
  switch (type) {
    case 'daily': {
      const d = parse(key, 'yyyy-MM-dd', new Date());
      return isNaN(d.getTime()) ? null : d;
    }
    case 'weekly': {
      const week = Number(m[2]);
      if (week < 1 || week > 53) return null;
      // anchor to a mid-year date in the ISO week-year, then set the week
      const anchor = new Date(year, 5, 15);
      return startOfISOWeek(setISOWeek(anchor, week));
    }
    case 'monthly': {
      const month = Number(m[2]);
      if (month < 1 || month > 12) return null;
      return new Date(year, month - 1, 1);
    }
    case 'quarterly': return new Date(year, (Number(m[2]) - 1) * 3, 1);
    case 'yearly': return new Date(year, 0, 1);
  }
}

export function shiftKey(key: string, type: PeriodType, delta: number): string {
  const date = keyToDate(key, type);
  if (!date) return key;
  switch (type) {
    case 'daily': return periodKey(addDays(date, delta), type);
    case 'weekly': return periodKey(addWeeks(date, delta), type);
    case 'monthly': return periodKey(addMonths(date, delta), type);
    case 'quarterly': return periodKey(addQuarters(date, delta), type);
    case 'yearly': return periodKey(addYears(date, delta), type);
  }
}

/** Inclusive [start, end] date range covered by a period key. */
export function keyRange(key: string, type: PeriodType): { start: Date; end: Date } | null {
  const start = keyToDate(key, type);
  if (!start) return null;
  switch (type) {
    case 'daily': return { start, end: start };
    case 'weekly': return { start, end: endOfISOWeek(start) };
    case 'monthly': return { start: startOfMonth(start), end: endOfMonth(start) };
    case 'quarterly': return { start: startOfQuarter(start), end: endOfQuarter(start) };
    case 'yearly': return { start: startOfYear(start), end: endOfYear(start) };
  }
}

/** Human title for a period note, e.g. "Friday, October 17, 2026" / "Week 42, 2026". */
export function keyTitle(key: string, type: PeriodType): string {
  const date = keyToDate(key, type);
  if (!date) return key;
  switch (type) {
    case 'daily': return format(date, 'EEEE, MMMM d, yyyy');
    case 'weekly': return `Week ${getISOWeek(date)}, ${getISOWeekYear(date)}`;
    case 'monthly': return format(date, 'MMMM yyyy');
    case 'quarterly': return `Q${getQuarter(date)} ${format(date, 'yyyy')}`;
    case 'yearly': return format(date, 'yyyy');
  }
}

export interface ChildPeriod {
  key: string;
  type: PeriodType;
  /** short chip label, e.g. "Mon 6", "W28", "Jul", "Q3" */
  label: string;
  /** true when the child period contains today */
  isCurrent: boolean;
}

/**
 * Drill-down chain: a week's days, a month's ISO weeks, a quarter's
 * months, a year's quarters. Daily has no children.
 */
export function childPeriods(key: string, type: PeriodType, now: Date = new Date()): ChildPeriod[] {
  const range = keyRange(key, type);
  if (!range) return [];
  const currentKeyOf = (t: PeriodType) => periodKey(now, t);
  switch (type) {
    case 'daily':
      return [];
    case 'weekly': {
      const days: ChildPeriod[] = [];
      for (let i = 0; i < 7; i++) {
        const d = addDays(range.start, i);
        const k = periodKey(d, 'daily');
        days.push({ key: k, type: 'daily', label: format(d, 'EEE d'), isCurrent: k === currentKeyOf('daily') });
      }
      return days;
    }
    case 'monthly': {
      const weeks: ChildPeriod[] = [];
      let cursor = startOfISOWeek(range.start);
      while (cursor <= range.end) {
        const k = periodKey(cursor, 'weekly');
        if (!weeks.some((w) => w.key === k)) {
          weeks.push({ key: k, type: 'weekly', label: `W${getISOWeek(cursor)}`, isCurrent: k === currentKeyOf('weekly') });
        }
        cursor = addWeeks(cursor, 1);
      }
      return weeks;
    }
    case 'quarterly': {
      const months: ChildPeriod[] = [];
      for (let i = 0; i < 3; i++) {
        const d = addMonths(range.start, i);
        const k = periodKey(d, 'monthly');
        months.push({ key: k, type: 'monthly', label: format(d, 'MMM'), isCurrent: k === currentKeyOf('monthly') });
      }
      return months;
    }
    case 'yearly': {
      const quarters: ChildPeriod[] = [];
      for (let i = 0; i < 4; i++) {
        const d = addQuarters(range.start, i);
        const k = periodKey(d, 'quarterly');
        quarters.push({ key: k, type: 'quarterly', label: `Q${i + 1}`, isCurrent: k === currentKeyOf('quarterly') });
      }
      return quarters;
    }
  }
}

/** The "zoom out" chain: daily → weekly → monthly → quarterly → yearly. */
export function parentPeriod(key: string, type: PeriodType): { key: string; type: PeriodType } | null {
  const date = keyToDate(key, type);
  if (!date) return null;
  const order: PeriodType[] = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
  const idx = order.indexOf(type);
  if (idx === -1 || idx === order.length - 1) return null;
  const parent = order[idx + 1];
  return { key: periodKey(date, parent), type: parent };
}
