// Composes the day's readings from local reference data: prayer_day() for
// the calendar + citations, src/lib/prayer/citation.ts to turn each citation
// into verse ranges, and prayer_reading_text() to resolve those ranges to
// WEBCE verse text. No outbound HTTP request — the whole point of Phase 1
// Task 4 is to stop scraping universalis.com.
//
// Kept separate from index.ts (which only wires this to a Supabase client
// and an HTTP handler) so it is testable with a stubbed client, matching the
// pattern in supabase/functions/event-share/runShare.ts.

import { parseCitation } from '../../../src/lib/prayer/citation.ts';

export const APP_SOURCE_URL = 'https://gleeworld.org/prayer';

// Shown when a date has no imported calendar row at all — outside the
// 2020-2035 window the importer covers, or a date not yet imported. Distinct
// from the old Universalis-window message: our data isn't a rolling window,
// so this should be rare.
export const NO_READINGS_MESSAGE =
  "We don't have readings imported for this date.";

export interface ReadingBlock {
  heading: string;
  citation: string | null;
  summary: string | null;
  html: string;
}

export interface ReadingsResult {
  date: string;
  sourceUrl: string;
  liturgicalTitle: string | null;
  readings: ReadingBlock[];
  error?: string;
  outOfRange?: boolean;
}

interface RpcResult<T> {
  data: T | null;
  error: { message: string } | null;
}

export interface SupabaseRpcClient {
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<RpcResult<unknown>>;
}

interface PrayerDayReading {
  slot: string;
  citation: string;
  schema_label: string;
}

interface PrayerDayEvent {
  name: string;
  readings: PrayerDayReading[];
}

interface PrayerDayResult {
  events: PrayerDayEvent[];
}

interface PrayerReadingTextResult {
  attribution: string | null;
  verses: Array<{ chapter: number; verse: number; text: string }>;
}

// Slots observed in Phase 0's LitCal import (see prayer-phase0.md) plus the
// rarer numbered/epistle/note ones. Anything not listed here still gets a
// readable heading via title-casing the slot name.
const SLOT_HEADINGS: Record<string, string> = {
  first_reading: 'First Reading',
  second_reading: 'Second Reading',
  third_reading: 'Third Reading',
  responsorial_psalm: 'Responsorial Psalm',
  gospel_acclamation: 'Gospel Acclamation',
  gospel: 'Gospel',
  palm_gospel: 'Palm Gospel',
  epistle: 'Epistle',
  note: 'Note',
};

function humanizeSlot(slot: string): string {
  if (SLOT_HEADINGS[slot]) return SLOT_HEADINGS[slot];
  return slot
    .split('_')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderVerses(
  verses: PrayerReadingTextResult['verses'],
  attribution: string | null,
): string {
  if (verses.length === 0) return '';
  const body = verses
    .map((v) => `<p><sup>${v.chapter}:${v.verse}</sup> ${escapeHtml(v.text)}</p>`)
    .join('');
  // Half-verse citations (e.g. "9a") resolve to the whole verse — WEBCE has
  // no half-verse granularity. Named here rather than silently, per the
  // Phase 1 plan's risk #2.
  const attributionLine = attribution
    ? `<p><em>${escapeHtml(attribution)}</em></p>`
    : '';
  return body + attributionLine;
}

export async function buildReadingsResponse(opts: {
  supabase: SupabaseRpcClient;
  date: string;
  rite?: string;
  translation?: string;
}): Promise<ReadingsResult> {
  const { supabase, date, rite = 'roman_catholic', translation = 'WEBCE' } = opts;

  const { data: dayData, error: dayError } = await supabase.rpc('prayer_day', {
    p_date: date,
    p_rite: rite,
  });
  if (dayError) throw new Error(`prayer_day: ${dayError.message}`);

  const events = ((dayData as PrayerDayResult | null)?.events ?? []) as PrayerDayEvent[];
  if (events.length === 0) {
    return {
      date,
      sourceUrl: APP_SOURCE_URL,
      liturgicalTitle: null,
      readings: [],
      error: NO_READINGS_MESSAGE,
      outOfRange: true,
    };
  }

  // prayer_day() already orders events by rank_grade DESC, so the top entry
  // is the day's principal celebration.
  const top = events[0];
  const allReadings = top.readings ?? [];

  // Christmas and the Pentecost Vigil nest multiple complete formularies
  // (night/dawn/day, schema_one/two/three) under distinct schema_labels.
  // Showing every Mass at once would be unreadable, so this picks one — the
  // first schema prayer_day() returns readings for.
  const primarySchema = allReadings[0]?.schema_label ?? '';
  const readingsForDay = allReadings.filter((r) => r.schema_label === primarySchema);

  const blocks: ReadingBlock[] = [];
  for (const r of readingsForDay) {
    const heading = humanizeSlot(r.slot);
    const parsed = parseCitation(r.citation);

    // Citations like "From the Common of the Blessed Virgin Mary" (LitCal's
    // string-valued readings) and any segment citation.ts can't resolve a
    // book for degrade to citation-only, same as the old scrape did for a
    // psalm-only entry.
    if (!parsed.usfmCode || parsed.ranges.length === 0) {
      blocks.push({ heading, citation: r.citation, summary: null, html: '' });
      continue;
    }

    const { data: textData, error: textError } = await supabase.rpc('prayer_reading_text', {
      p_translation: translation,
      p_usfm: parsed.usfmCode,
      p_ranges: parsed.ranges,
    });
    if (textError) throw new Error(`prayer_reading_text: ${textError.message}`);

    const result = textData as PrayerReadingTextResult | null;
    const html = renderVerses(result?.verses ?? [], result?.attribution ?? null);

    blocks.push({ heading, citation: r.citation, summary: null, html });
  }

  return {
    date,
    sourceUrl: APP_SOURCE_URL,
    liturgicalTitle: top.name ?? null,
    readings: blocks,
  };
}
