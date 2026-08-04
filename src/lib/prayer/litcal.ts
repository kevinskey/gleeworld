/**
 * Normalises LiturgicalCalendarAPI (LitCal, Apache-2.0) year payloads into the
 * row shapes used by gw_prayer_calendar_days / gw_prayer_readings.
 *
 * Kept free of any database or network dependency so it is unit-testable.
 *
 * Two upstream quirks drive the design, both confirmed against the live API:
 *   1. `readings` is an object on most events but a plain string on ~21 events
 *      per year (Saturday Memorials of the BVM say "From the Common of the
 *      Blessed Virgin Mary"; a few are empty).
 *   2. Christmas, the Easter Vigil and the Pentecost Vigil carry slots outside
 *      the canonical five, so unknown slots are imported rather than dropped.
 */

import { compareSlots, type NormalizedReading } from './slots';

export const LITCAL_SOURCE = 'litcal';

export type { NormalizedReading };

export interface NormalizedDay {
  rite: 'roman_catholic';
  dayDate: string;
  eventKey: string;
  name: string;
  rankGrade: number | null;
  rankLabel: string | null;
  color: string[];
  liturgicalSeason: string | null;
  sundayCycle: 'A' | 'B' | 'C' | null;
  psalterWeek: number | null;
  isHolyDayOfObligation: boolean;
  readings: NormalizedReading[];
}

export interface LitCalEvent {
  event_key: string;
  name: string;
  color?: string[];
  grade?: number;
  grade_lcl?: string;
  date: string;
  liturgical_season?: string;
  liturgical_year?: string;
  psalter_week?: number;
  holy_day_of_obligation?: boolean;
  readings?: Record<string, string> | string;
}

export interface LitCalPayload {
  litcal: LitCalEvent[];
}

function cycleLetter(value: string | undefined): 'A' | 'B' | 'C' | null {
  if (!value) return null;
  const match = /\b([ABC])\b/.exec(value.toUpperCase());
  return match ? (match[1] as 'A' | 'B' | 'C') : null;
}

/** Sorts one flat slot map into liturgical order and drops blank citations. */
function flattenSlotMap(
  map: Record<string, unknown>,
  schemaLabel: string,
): NormalizedReading[] {
  const entries = Object.entries(map).filter(
    (entry): entry is [string, string] =>
      typeof entry[1] === 'string' && entry[1].trim() !== '',
  );

  // Stable sort: known slots in liturgical order first, unknown slots after in
  // the order the API returned them.
  entries.sort(([a], [b]) => compareSlots(a, b));

  return entries.map(([slot, citation], index) => ({
    slot,
    citation: citation.trim(),
    schemaLabel,
    sortOrder: index,
    source: LITCAL_SOURCE,
  }));
}

function normalizeReadings(readings: LitCalEvent['readings']): NormalizedReading[] {
  if (!readings) return [];

  // ~21 events a year carry a plain string rather than a slot map.
  if (typeof readings === 'string') {
    const citation = readings.trim();
    return citation
      ? [{ slot: 'note', citation, schemaLabel: '', sortOrder: 0, source: LITCAL_SOURCE }]
      : [];
  }

  // Christmas nests night/dawn/day and the Pentecost Vigil nests
  // schema_one/two/three: each nested value is a complete Mass formulary.
  // Flatten them into schemaLabel rather than dropping them.
  const nested = Object.entries(readings).filter(
    (entry): entry is [string, Record<string, unknown>] =>
      typeof entry[1] === 'object' && entry[1] !== null,
  );

  if (nested.length > 0) {
    const flat = Object.fromEntries(
      Object.entries(readings).filter(([, v]) => typeof v === 'string'),
    );
    return [
      ...flattenSlotMap(flat, ''),
      ...nested.flatMap(([label, map]) => flattenSlotMap(map, label)),
    ];
  }

  return flattenSlotMap(readings as Record<string, unknown>, '');
}

export function normalizeLitCalYear(payload: LitCalPayload): NormalizedDay[] {
  return (payload.litcal ?? []).map((event) => ({
    rite: 'roman_catholic' as const,
    dayDate: event.date.slice(0, 10),
    eventKey: event.event_key,
    name: event.name,
    rankGrade: typeof event.grade === 'number' ? event.grade : null,
    rankLabel: event.grade_lcl ?? null,
    color: event.color ?? [],
    liturgicalSeason: event.liturgical_season ?? null,
    sundayCycle: cycleLetter(event.liturgical_year),
    psalterWeek: typeof event.psalter_week === 'number' ? event.psalter_week : null,
    isHolyDayOfObligation: event.holy_day_of_obligation === true,
    readings: normalizeReadings(event.readings),
  }));
}
