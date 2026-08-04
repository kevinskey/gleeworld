/**
 * Normalises catholic-readings-api day payloads (MIT) into gw_prayer_readings
 * rows.
 *
 * Why this source rather than LitCal: LitCal's calendar is complete, but its
 * reading citations are blank on 28-50% of dates depending on the year (mostly
 * ferial weekdays in Ordinary Time). This dataset was measured at 365/365 days
 * for 2026 with a citation on every day. It carries CITATIONS ONLY — no
 * scripture text — so the text is rendered from a public-domain translation
 * we host ourselves.
 *
 * Coverage is currently 2026 and 2027 only; earlier and later years are not
 * populated upstream. Adding each new year is an ongoing maintenance task.
 */

import { compareSlots, type NormalizedReading } from './slots';

export const READINGS_SOURCE = 'catholic-readings-api';

/**
 * Upstream key -> canonical slot. Anything not listed is ignored rather than
 * imported under a guessed name; all four keys below were confirmed present
 * across the full 2026 dataset.
 */
const SLOT_BY_UPSTREAM_KEY: Record<string, string> = {
  firstReading: 'first_reading',
  psalm: 'responsorial_psalm',
  secondReading: 'second_reading',
  gospel: 'gospel',
};

export interface ReadingsDayPayload {
  date: string;
  season?: string;
  subSeason?: string;
  readings?: Record<string, unknown>;
  usccbLink?: string;
}

export interface NormalizedReadingsDay {
  dayDate: string;
  season: string | null;
  subSeason: string | null;
  readings: NormalizedReading[];
}

export function normalizeReadingsDay(payload: ReadingsDayPayload): NormalizedReadingsDay {
  const raw = payload.readings ?? {};

  const mapped = Object.entries(raw)
    .filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === 'string' &&
        entry[1].trim() !== '' &&
        SLOT_BY_UPSTREAM_KEY[entry[0]] !== undefined,
    )
    .map(([key, citation]) => ({
      slot: SLOT_BY_UPSTREAM_KEY[key],
      citation: citation.trim(),
    }));

  mapped.sort((a, b) => compareSlots(a.slot, b.slot));

  return {
    dayDate: payload.date.slice(0, 10),
    season: payload.season ?? null,
    subSeason: payload.subSeason ?? null,
    readings: mapped.map((r, index) => ({
      slot: r.slot,
      citation: r.citation,
      schemaLabel: '',
      sortOrder: index,
      source: READINGS_SOURCE,
    })),
  };
}
