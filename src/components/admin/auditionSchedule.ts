// Pure helpers for the audition schedule editor.
//
// Separated from the component so the timezone arithmetic — the part that can
// silently put an audition on the wrong DAY — is unit-testable.
//
// ─── The contract these must honour ──────────────────────────────────────────
//
// `audition_time_blocks` is read by useAvailableAuditionSlots.ts, and its
// semantics are not what the column names suggest:
//
//   * ONE ROW = ONE AUDITION DATE. The applicant's date picker collects the
//     DATE of each row's start_date, converted to America/New_York. A row is
//     NOT a multi-day range.
//   * start_date's TIME-OF-DAY is when auditions begin that day.
//   * end_date's TIME-OF-DAY is when they end. Its DATE PART IS IGNORED.
//   * appointment_duration_minutes is the slot length.
//
// Because the reader converts to Eastern, an admin choosing "Aug 20, 10:00am"
// must be stored as the instant that renders as Aug 20 10:00 in Eastern — not
// in the admin's own timezone. A director in California picking 10:00am would
// otherwise write 18:00Z, which is 2pm Eastern; and picking 9:00pm would land
// the row on the FOLLOWING DAY in Eastern, silently moving the audition.
// fromZonedTime does that conversion, and the DST offset is handled per-date.

import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';

/** The timezone useAvailableAuditionSlots reads in. Must stay in sync. */
export const AUDITION_TZ = 'America/New_York';

export interface ScheduleDraft {
  /** Calendar day, `yyyy-MM-dd`, as the admin picked it. */
  date: string;
  /** 24h `HH:mm`. */
  startTime: string;
  /** 24h `HH:mm`. */
  endTime: string;
  durationMinutes: number;
}

export interface BlockRange {
  start_date: string;
  end_date: string;
}

/**
 * Convert an admin's local calendar choice into the timestamptz pair the
 * applicant-facing reader expects, anchored in Eastern.
 */
export function buildBlockRange(draft: ScheduleDraft): BlockRange {
  const start = fromZonedTime(`${draft.date}T${draft.startTime}:00`, AUDITION_TZ);
  const end = fromZonedTime(`${draft.date}T${draft.endTime}:00`, AUDITION_TZ);
  return { start_date: start.toISOString(), end_date: end.toISOString() };
}

/** How many bookable slots a draft yields. 0 when the window is invalid. */
export function slotCount(draft: ScheduleDraft): number {
  const [sh, sm] = draft.startTime.split(':').map(Number);
  const [eh, em] = draft.endTime.split(':').map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  const minutes = eh * 60 + em - (sh * 60 + sm);
  if (minutes <= 0 || !draft.durationMinutes || draft.durationMinutes <= 0) return 0;
  return Math.floor(minutes / draft.durationMinutes);
}

/** Human-readable reason a draft cannot be saved, or null when it is valid. */
export function validateDraft(draft: ScheduleDraft): string | null {
  if (!draft.date) return 'Pick a date.';
  if (!draft.startTime || !draft.endTime) return 'Set a start and end time.';
  if (!draft.durationMinutes || draft.durationMinutes <= 0) {
    return 'Slot length must be at least 1 minute.';
  }
  if (slotCount(draft) < 1) {
    return 'That window is too short for even one slot — check the times and slot length.';
  }
  return null;
}

/** Render a stored block back in Eastern, for the admin list. */
export function describeBlock(block: {
  start_date: string;
  end_date: string;
  appointment_duration_minutes: number | null;
}): { day: string; window: string; slots: number } {
  const start = toZonedTime(new Date(block.start_date), AUDITION_TZ);
  const end = toZonedTime(new Date(block.end_date), AUDITION_TZ);
  const duration = block.appointment_duration_minutes || 0;
  const minutes =
    end.getHours() * 60 + end.getMinutes() - (start.getHours() * 60 + start.getMinutes());
  return {
    day: format(start, 'EEE, MMM d, yyyy'),
    window: `${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}`,
    slots: duration > 0 && minutes > 0 ? Math.floor(minutes / duration) : 0,
  };
}
