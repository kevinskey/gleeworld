/**
 * Builds the `usccb-readings` response from our own data — the calendar +
 * citations imported in Phase 0 (`prayer_day`) and WEBCE scripture text
 * resolved through Phase 1's `prayer_reading_text` RPC — instead of scraping
 * universalis.com at request time.
 *
 * Citation parsing happens in exactly one place, `src/lib/prayer/citation.ts`;
 * this module calls it and otherwise only shapes RPC results into the
 * response contract `index.ts` has served since the Universalis-scraping days
 * (`{ date, sourceUrl, liturgicalTitle, readings: [{heading, citation,
 * summary, html}] }`), so deployed clients see no difference in shape.
 */

import { parseCitation } from '../../../src/lib/prayer/citation.ts';

export interface ReadingBlock {
  heading: string;
  citation: string | null;
  summary: string | null;
  html: string;
}

export interface RespOk {
  date: string;
  sourceUrl: string;
  liturgicalTitle: string | null;
  readings: ReadingBlock[];
}

export interface RespUnavailable {
  date: string;
  sourceUrl: string;
  liturgicalTitle: null;
  readings: [];
  error: string;
  outOfRange: true;
}

// Kept for backward compat with the old field name/meaning: "this date isn't
// covered yet", regardless of cause (calendar not imported for the date, or
// no citations attached to the day's celebration).
export const READINGS_NOT_AVAILABLE =
  "This date's readings aren't in GleeWorld yet. Try a date within the " +
  'currently loaded liturgical calendar.';

// Our own app is the source now, not universalis.com.
export const SOURCE_URL = 'https://gleeworld.org/prayer';

// Upstream slot keys are snake_case; these are the headings the readings
// panel and the Liturgy Planner's heading-matching regexes both expect.
const SLOT_HEADINGS: Record<string, string> = {
  first_reading: 'First Reading',
  responsorial_psalm: 'Responsorial Psalm',
  second_reading: 'Second Reading',
  gospel_acclamation: 'Gospel Acclamation',
  gospel: 'Gospel',
  epistle: 'Epistle',
  palm_gospel: 'Gospel at the Procession',
  note: 'Note',
};

function headingFor(slot: string): string {
  return (
    SLOT_HEADINGS[slot] ??
    slot
      .split('_')
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(' ')
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface PrayerDayReading {
  slot: string;
  citation: string;
  schema_label: string;
}

interface PrayerDayEvent {
  event_key: string;
  name: string;
  rank_grade: number | null;
  readings: PrayerDayReading[];
}

interface PrayerDayResult {
  events: PrayerDayEvent[];
}

interface VerseTextResult {
  translation: string;
  attribution: string | null;
  verses: Array<{ chapter: number; verse: number; text: string }>;
}

export interface SupabaseLike {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
}

/** One reading citation resolved to verse-text HTML, or a citation-only
 *  block when the citation doesn't parse (e.g. "From the Common of the
 *  Blessed Virgin Mary") — same graceful degradation the old scraper had
 *  for a reading with no fetchable body. */
async function buildBlock(
  reading: PrayerDayReading,
  supabase: SupabaseLike,
): Promise<ReadingBlock> {
  const heading = headingFor(reading.slot);
  const citation = reading.citation?.trim() || null;
  const block: ReadingBlock = { heading, citation, summary: null, html: '' };
  if (!citation) return block;

  const parsed = parseCitation(citation);
  if (!parsed.usfmCode || parsed.ranges.length === 0) return block;

  const { data, error } = await supabase.rpc('prayer_reading_text', {
    p_translation: 'WEBCE',
    p_usfm: parsed.usfmCode,
    p_ranges: parsed.ranges,
  });
  if (error || !data) return block;

  const text = data as VerseTextResult;
  if (!text.verses?.length) return block;

  const versesHtml = text.verses
    .map((v) => `<p><sup>${v.verse}</sup> ${escapeHtml(v.text)}</p>`)
    .join('');
  const attributionHtml = text.attribution
    ? `<p><em>${escapeHtml(text.attribution)}</em></p>`
    : '';
  block.html = versesHtml + attributionHtml;
  return block;
}

export async function buildReadingsFromDb(
  date: string,
  supabase: SupabaseLike,
): Promise<RespOk | RespUnavailable | { error: string }> {
  const { data, error } = await supabase.rpc('prayer_day', {
    p_date: date,
    p_rite: 'roman_catholic',
  });
  if (error) return { error: error.message };

  const day = data as PrayerDayResult | null;
  const events = day?.events ?? [];
  if (events.length === 0) {
    return {
      date,
      sourceUrl: SOURCE_URL,
      liturgicalTitle: null,
      readings: [],
      error: READINGS_NOT_AVAILABLE,
      outOfRange: true,
    };
  }

  // prayer_day() already orders events by rank_grade desc — the highest-
  // ranked celebration (a feast over its underlying feria) comes first.
  const event = events[0];
  const readings = await Promise.all(
    event.readings.map((r) => buildBlock(r, supabase)),
  );

  return {
    date,
    sourceUrl: SOURCE_URL,
    liturgicalTitle: event.name ?? null,
    readings,
  };
}
