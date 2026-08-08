// The failure this file exists to prevent: an audition silently appearing on
// the wrong DAY for applicants.
//
// useAvailableAuditionSlots converts every block to America/New_York and takes
// the DATE of start_date as the bookable day. So the admin's calendar pick has
// to be anchored in Eastern, not in whatever timezone the admin's laptop is in.
import { describe, it, expect } from 'vitest';
import {
  buildBlockRange,
  slotCount,
  validateDraft,
  describeBlock,
  AUDITION_TZ,
} from '../auditionSchedule';
import { toZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';

/** What the applicant-facing hook will believe the date is. */
const asAuditionDay = (iso: string) =>
  format(toZonedTime(new Date(iso), AUDITION_TZ), 'yyyy-MM-dd');

const draft = (over: Partial<Parameters<typeof buildBlockRange>[0]> = {}) => ({
  date: '2026-08-20',
  startTime: '10:00',
  endTime: '16:00',
  durationMinutes: 15,
  ...over,
});

describe('buildBlockRange — Eastern anchoring', () => {
  it('lands on the day the admin picked, read back in Eastern', () => {
    const r = buildBlockRange(draft());
    expect(asAuditionDay(r.start_date)).toBe('2026-08-20');
  });

  it('stores 10:00 Eastern as 14:00Z in summer (EDT, UTC-4)', () => {
    const r = buildBlockRange(draft());
    expect(r.start_date).toBe('2026-08-20T14:00:00.000Z');
    expect(r.end_date).toBe('2026-08-20T20:00:00.000Z');
  });

  it('handles winter dates at the other DST offset (EST, UTC-5)', () => {
    // Same wall-clock time, five hours' offset instead of four. A fixed -4
    // would put this an hour out and, at the edges, on the wrong day.
    const r = buildBlockRange(draft({ date: '2026-01-14' }));
    expect(r.start_date).toBe('2026-01-14T15:00:00.000Z');
    expect(asAuditionDay(r.start_date)).toBe('2026-01-14');
  });

  it('keeps a late-evening audition on its own day, not the next one', () => {
    // The regression: 9pm Eastern is 01:00Z the FOLLOWING day. Storing the
    // admin's local time raw would move the audition a day forward for every
    // applicant. Reading it back in Eastern must still say the 20th.
    const r = buildBlockRange(draft({ startTime: '21:00', endTime: '23:00' }));
    expect(r.start_date).toBe('2026-08-21T01:00:00.000Z');
    expect(asAuditionDay(r.start_date)).toBe('2026-08-20');
  });
});

describe('slotCount', () => {
  it('divides the window by the slot length', () => {
    expect(slotCount(draft())).toBe(24); // 6h / 15m
    expect(slotCount(draft({ durationMinutes: 30 }))).toBe(12);
  });

  it('floors a partial trailing slot rather than overbooking', () => {
    expect(slotCount(draft({ endTime: '10:50', durationMinutes: 15 }))).toBe(3);
  });

  it('returns 0 for an inverted or empty window', () => {
    expect(slotCount(draft({ endTime: '09:00' }))).toBe(0);
    expect(slotCount(draft({ endTime: '10:00' }))).toBe(0);
  });

  it('returns 0 rather than dividing by zero', () => {
    expect(slotCount(draft({ durationMinutes: 0 }))).toBe(0);
  });
});

describe('validateDraft', () => {
  it('accepts a sane draft', () => {
    expect(validateDraft(draft())).toBeNull();
  });

  it('rejects a window too short for one slot', () => {
    // The trap: 10 minutes with 15-minute slots looks fine in the form but
    // would publish a date with ZERO bookable times — exactly the dead end
    // this whole feature exists to remove.
    expect(validateDraft(draft({ endTime: '10:10' }))).toMatch(/too short/i);
  });

  it('rejects an inverted window, a missing date and a zero slot length', () => {
    expect(validateDraft(draft({ endTime: '09:00' }))).toBeTruthy();
    expect(validateDraft(draft({ date: '' }))).toMatch(/date/i);
    expect(validateDraft(draft({ durationMinutes: 0 }))).toMatch(/at least 1 minute/i);
  });
});

describe('describeBlock — round trip', () => {
  it('renders a stored block back as the admin entered it', () => {
    const r = buildBlockRange(draft());
    const d = describeBlock({ ...r, appointment_duration_minutes: 15 });
    expect(d.day).toBe('Thu, Aug 20, 2026');
    expect(d.window).toBe('10:00 AM – 4:00 PM');
    expect(d.slots).toBe(24);
  });

  it('describes the rows already seeded in production', () => {
    const d = describeBlock({
      start_date: '2026-08-10T14:00:00+00:00',
      end_date: '2026-08-10T20:00:00+00:00',
      appointment_duration_minutes: 15,
    });
    expect(d.day).toBe('Mon, Aug 10, 2026');
    expect(d.window).toBe('10:00 AM – 4:00 PM');
    expect(d.slots).toBe(24);
  });
});
