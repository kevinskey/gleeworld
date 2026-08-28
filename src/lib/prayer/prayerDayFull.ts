/**
 * Composes prayer_day() with per-reading verse text.
 *
 * Phase 1 (docs/superpowers/plans/2026-08-04-prayer-phase1.md), Task 3.
 *
 * The plan describes this as a single `prayer_day_full()` SQL RPC, but
 * Task 3's own stated architecture is that citation parsing "lives in
 * exactly one place: src/lib/prayer/citation.ts" — a pure-SQL RPC would
 * have to re-implement that parser in PL/pgSQL, creating a second copy
 * that drifts from the tested one. This module keeps the single source of
 * truth: it calls the existing `prayer_day` RPC, parses each reading's
 * citation with `parseCitation`, and resolves verse ranges via the
 * existing `prayer_reading_text` RPC. Same result, no duplicated parser.
 */

import { parseCitation } from './citation';

export interface PrayerDayFullVerse {
  chapter: number;
  verse: number;
  text: string;
}

export interface PrayerDayFullReading {
  slot: string;
  citation: string;
  schemaLabel: string;
  /** null when the citation's book name could not be resolved (e.g. "From the Common of the BVM"). */
  usfmCode: string | null;
  /** Citation segments that failed to parse; verses are still returned for the segments that did. */
  unparsed: string[];
  translation: string;
  attribution: string | null;
  verses: PrayerDayFullVerse[];
}

export interface PrayerDayFullEvent {
  eventKey: string;
  name: string;
  rankGrade: number | null;
  rankLabel: string | null;
  color: string[];
  liturgicalSeason: string | null;
  sundayCycle: string | null;
  psalterWeek: number | null;
  isHolyDayOfObligation: boolean;
  readings: PrayerDayFullReading[];
}

export interface PrayerDayFullResult {
  date: string;
  rite: string;
  events: PrayerDayFullEvent[];
}

interface RpcError {
  message: string;
}

/** Minimal shape of a Supabase client's `.rpc()` — enough to unit-test without the real SDK. */
export interface RpcClient {
  rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: RpcError | null }>;
}

interface RawReading {
  slot: string;
  citation: string;
  schema_label: string;
}

interface RawEvent {
  event_key: string;
  name: string;
  rank_grade: number | null;
  rank_label: string | null;
  color: string[];
  liturgical_season: string | null;
  sunday_cycle: string | null;
  psalter_week: number | null;
  is_holy_day_of_obligation: boolean;
  readings: RawReading[];
}

interface RawDay {
  date: string;
  rite: string;
  events: RawEvent[];
}

interface ReadingTextResult {
  translation: string;
  attribution: string | null;
  verses: PrayerDayFullVerse[];
}

export async function fetchPrayerDayFull(
  client: RpcClient,
  date: string,
  rite = 'roman_catholic',
  translation = 'WEBCE',
): Promise<PrayerDayFullResult> {
  const { data, error } = await client.rpc('prayer_day', { p_date: date, p_rite: rite });
  if (error) throw new Error(`prayer_day: ${error.message}`);
  const day = (data ?? { date, rite, events: [] }) as RawDay;

  const events: PrayerDayFullEvent[] = [];
  for (const ev of day.events ?? []) {
    const readings: PrayerDayFullReading[] = [];

    for (const r of ev.readings ?? []) {
      const parsed = parseCitation(r.citation);
      let verses: PrayerDayFullVerse[] = [];
      let attribution: string | null = null;

      // No resolvable book (e.g. a "note" slot like "From the Common of the
      // BVM") or no ranges at all: nothing to look up, skip the round trip.
      if (parsed.usfmCode && parsed.ranges.length > 0) {
        const { data: textData, error: textErr } = await client.rpc('prayer_reading_text', {
          p_translation: translation,
          p_usfm: parsed.usfmCode,
          p_ranges: parsed.ranges,
        });
        if (textErr) throw new Error(`prayer_reading_text (${r.citation}): ${textErr.message}`);
        const resolved = textData as ReadingTextResult | null;
        verses = resolved?.verses ?? [];
        attribution = resolved?.attribution ?? null;
      }

      readings.push({
        slot: r.slot,
        citation: r.citation,
        schemaLabel: r.schema_label,
        usfmCode: parsed.usfmCode,
        unparsed: parsed.unparsed,
        translation,
        attribution,
        verses,
      });
    }

    events.push({
      eventKey: ev.event_key,
      name: ev.name,
      rankGrade: ev.rank_grade,
      rankLabel: ev.rank_label,
      color: ev.color,
      liturgicalSeason: ev.liturgical_season,
      sundayCycle: ev.sunday_cycle,
      psalterWeek: ev.psalter_week,
      isHolyDayOfObligation: ev.is_holy_day_of_obligation,
      readings,
    });
  }

  return { date: day.date, rite: day.rite, events };
}
