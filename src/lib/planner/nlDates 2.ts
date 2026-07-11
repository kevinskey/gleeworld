// Natural-language date parsing for task scheduling. Pragmatic, not a
// grammar: handles the phrases directors actually type. Callers show a
// parsed-date preview before saving, so a miss is visible, never silent.
// All results are plain local dates (YYYY-MM-DD) + optional time; the
// caller owns timezone handling when persisting timestamps.
import {
  addDays, addWeeks, addMonths, format, getDay, isValid, nextDay, parse, setDate, startOfDay,
} from 'date-fns';
import type { Day } from 'date-fns';
import type { Recurrence } from './types';
import { WEEKDAYS_MON_FRI } from './recurrence';

export interface ParsedSchedule {
  /** YYYY-MM-DD, null when only a recurrence (or nothing) was recognized */
  date: string | null;
  /** HH:mm 24h when a time was recognized */
  time: string | null;
  recurrence: Recurrence | null;
  /** human echo of what was understood, for the preview UI */
  description: string;
  matched: boolean;
}

const WEEKDAYS: Record<string, Day> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

const MONTHS: Record<string, number> = {
  january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3,
  may: 4, june: 5, jun: 5, july: 6, jul: 6, august: 7, aug: 7,
  september: 8, sep: 8, sept: 8, october: 9, oct: 9,
  november: 10, nov: 10, december: 11, dec: 11,
};

function fmt(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

/** "7 pm", "7:30pm", "19:00" → HH:mm (24h) or null. */
export function parseTime(text: string): string | null {
  const m = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i.exec(text.trim());
  if (!m) return null;
  let hours = Number(m[1]);
  const minutes = Number(m[2] ?? 0);
  const meridiem = m[3]?.toLowerCase();
  if (hours > 23 || minutes > 59) return null;
  if (meridiem === 'pm' && hours < 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;
  if (!meridiem && !m[2]) return null; // bare number without am/pm or :mm — too ambiguous
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function parseSchedule(input: string, now: Date = new Date()): ParsedSchedule {
  const none: ParsedSchedule = { date: null, time: null, recurrence: null, description: '', matched: false };
  const raw = input.trim();
  if (!raw) return none;
  const text = raw.toLowerCase().replace(/\s+/g, ' ');
  const today = startOfDay(now);

  // split off "... at <time>"
  let time: string | null = null;
  let datePart = text;
  const atMatch = /^(.*?)\s+at\s+(.+)$/.exec(text);
  if (atMatch) {
    const t = parseTime(atMatch[2]);
    if (t) {
      time = t;
      datePart = atMatch[1].trim();
    }
  }

  const done = (date: Date | null, recurrence: Recurrence | null, description: string): ParsedSchedule => ({
    date: date ? fmt(date) : null,
    time,
    recurrence,
    description: time && description ? `${description} at ${time}` : description,
    matched: true,
  });

  // ── recurrences ────────────────────────────────────────────────────
  if (/^every ?day$|^daily$/.test(datePart)) {
    return done(today, { freq: 'daily' }, 'Every day');
  }
  if (/^every weekday$|^weekdays$/.test(datePart)) {
    return done(today, { freq: 'weekly', byweekday: WEEKDAYS_MON_FRI }, 'Every weekday');
  }
  {
    const m = /^every (\w+)$/.exec(datePart);
    if (m && WEEKDAYS[m[1]] !== undefined) {
      const day = WEEKDAYS[m[1]];
      const first = getDay(today) === day ? today : nextDay(today, day);
      return done(first, { freq: 'weekly', byweekday: [day] }, `Every ${format(first, 'EEEE')}`);
    }
  }
  if (/^every week$|^weekly$/.test(datePart)) return done(today, { freq: 'weekly' }, 'Every week');
  if (/^every month$|^monthly$/.test(datePart)) return done(today, { freq: 'monthly' }, 'Every month');
  if (/^every year$|^yearly$|^annually$/.test(datePart)) return done(today, { freq: 'yearly' }, 'Every year');

  // ── single dates ───────────────────────────────────────────────────
  if (datePart === 'today') return done(today, null, 'Today');
  if (datePart === 'tonight') {
    if (!time) time = '19:00';
    return done(today, null, 'Tonight');
  }
  if (datePart === 'tomorrow' || datePart === 'tmrw') return done(addDays(today, 1), null, 'Tomorrow');
  if (datePart === 'yesterday') return done(addDays(today, -1), null, 'Yesterday');
  if (datePart === 'next week') return done(addWeeks(today, 1), null, format(addWeeks(today, 1), 'EEE, MMM d'));
  if (datePart === 'next month') return done(addMonths(today, 1), null, format(addMonths(today, 1), 'MMM d'));

  // "friday" / "next friday" — both mean the upcoming occurrence
  // (nextDay is strictly after today, so "friday" typed on a Friday
  // means next week's Friday — the unambiguous reading)
  {
    const m = /^(?:next )?(\w+)$/.exec(datePart);
    if (m && WEEKDAYS[m[1]] !== undefined) {
      const d = nextDay(today, WEEKDAYS[m[1]]);
      return done(d, null, format(d, 'EEEE, MMM d'));
    }
  }

  // "in 3 days" / "in 2 weeks"
  {
    const m = /^in (\d+) (day|days|week|weeks|month|months)$/.exec(datePart);
    if (m) {
      const n = Number(m[1]);
      const unit = m[2];
      const d = unit.startsWith('day') ? addDays(today, n)
        : unit.startsWith('week') ? addWeeks(today, n)
        : addMonths(today, n);
      return done(d, null, format(d, 'EEE, MMM d, yyyy'));
    }
  }

  // "october 17" / "oct 17" / "october 17 2027"
  {
    const m = /^(\w+) (\d{1,2})(?:st|nd|rd|th)?(?:,? (\d{4}))?$/.exec(datePart);
    if (m && MONTHS[m[1]] !== undefined) {
      const dayNum = Number(m[2]);
      if (dayNum >= 1 && dayNum <= 31) {
        let d = setDate(new Date(today.getFullYear(), MONTHS[m[1]], 1), dayNum);
        if (m[3]) d = new Date(Number(m[3]), MONTHS[m[1]], dayNum);
        else if (d < today) d = new Date(today.getFullYear() + 1, MONTHS[m[1]], dayNum);
        if (isValid(d)) return done(d, null, format(d, 'EEE, MMM d, yyyy'));
      }
    }
  }

  // ISO and slash dates
  {
    const iso = parse(datePart, 'yyyy-MM-dd', now);
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart) && isValid(iso)) {
      return done(iso, null, format(iso, 'EEE, MMM d, yyyy'));
    }
    const m = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/.exec(datePart);
    if (m) {
      const year = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : today.getFullYear();
      const d = new Date(year, Number(m[1]) - 1, Number(m[2]));
      if (isValid(d) && d.getMonth() === Number(m[1]) - 1) {
        const final = !m[3] && d < today ? new Date(year + 1, Number(m[1]) - 1, Number(m[2])) : d;
        return done(final, null, format(final, 'EEE, MMM d, yyyy'));
      }
    }
  }

  return none;
}
