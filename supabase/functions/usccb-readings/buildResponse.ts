// Builds the usccb-readings response from local Prayer module data instead of
// scraping universalis.com at request time. Phase 1 of the Prayer add-on
// (docs/superpowers/plans/2026-08-04-prayer-phase1.md, Task 4).
//
// Response contract is UNCHANGED from the scraping implementation — deployed
// iOS clients call this shape — only the source of the data changed:
//   { date, sourceUrl, liturgicalTitle, readings: [{ heading, citation, summary, html }] }
//
// Kept separate from index.ts (Deno serve()) so it is importable under
// Vitest with a stubbed Supabase client, matching the
// supabase/functions/event-share/runShare.ts pattern.
//
// Citation parsing lives in exactly one place — src/lib/prayer/citation.ts —
// per the Phase 1 plan. scripts/import-litcal.mjs and import-webce.mjs
// already reach from outside supabase/ into src/lib/prayer the same way;
// this is the same cross-directory import applied to an edge function.

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

interface PrayerReading {
  slot: string;
  citation: string;
  schema_label: string;
}

interface PrayerEvent {
  name: string;
  readings: PrayerReading[];
}

interface PrayerDayResult {
  events: PrayerEvent[];
}

interface PrayerReadingTextResult {
  attribution: string | null;
  verses: Array<{ chapter: number; verse: number; text: string }>;
}

export interface SupabaseRpcClient {
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

// Our own app, not the third-party site this used to scrape — see the risk
// this phase exists to close in the plan's "Why this phase" section.
const APP_SOURCE_URL = 'https://gleeworld.org';

const SLOT_HEADINGS: Record<string, string> = {
  first_reading: 'First Reading',
  responsorial_psalm: 'Responsorial Psalm',
  second_reading: 'Second Reading',
  third_reading: 'Third Reading',
  gospel_acclamation: 'Gospel Acclamation',
  gospel: 'Gospel',
  palm_gospel: 'Gospel at the Procession',
  epistle: 'Epistle',
  note: 'Reading',
};

function humanizeSlot(slot: string): string {
  return (
    SLOT_HEADINGS[slot] ??
    slot.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Verses + attribution rendered as the sanitizer-safe subset the frontend already allows. */
function renderVerseHtml(text: PrayerReadingTextResult): string {
  if (!text.verses.length) return '';
  const body = text.verses
    .map((v) => `<p><sup>${v.verse}</sup> ${escapeHtml(v.text)}</p>`)
    .join('');
  const attribution = text.attribution
    ? `<p><em>${escapeHtml(text.attribution)}</em></p>`
    : '';
  return body + attribution;
}

/**
 * Resolves one reading's citation to WEBCE verse text via prayer_reading_text.
 * Letter-chapter citations (Esther's Greek additions) and free-text "notes"
 * ("From the Common of the Blessed Virgin Mary") have no verses to resolve —
 * same documented approximation as citation.ts itself. The block is still
 * returned with its citation so the UI can show that, matching the old
 * scraper's "citation-only entries" behaviour for the Responsorial Psalm.
 */
async function resolveReadingText(
  supabase: SupabaseRpcClient,
  translation: string,
  citation: string,
): Promise<string> {
  const parsed = parseCitation(citation);
  if (!parsed.usfmCode || parsed.ranges.length === 0) return '';

  const { data, error } = await supabase.rpc('prayer_reading_text', {
    p_translation: translation,
    p_usfm: parsed.usfmCode,
    p_ranges: parsed.ranges,
  });
  if (error) throw new Error(`prayer_reading_text: ${error.message}`);
  return renderVerseHtml(data as PrayerReadingTextResult);
}

/**
 * Highest-ranked event only. A day can carry a feria plus an optional
 * memorial (prayer_day already orders by rank_grade DESC); a day with more
 * than one full formulary (Christmas night/dawn/day, the Pentecost Vigil's
 * schema_one/two/three) is a known limitation carried over unresolved from
 * the old scraper, which also surfaced only one Mass's worth of readings.
 */
export async function buildReadingsResponse(
  date: string,
  supabase: SupabaseRpcClient,
  translation = 'WEBCE',
): Promise<RespOk> {
  const { data, error } = await supabase.rpc('prayer_day', { p_date: date });
  if (error) throw new Error(`prayer_day: ${error.message}`);

  const primary = (data as PrayerDayResult | null)?.events?.[0];
  if (!primary) {
    return { date, sourceUrl: APP_SOURCE_URL, liturgicalTitle: null, readings: [] };
  }

  const readings: ReadingBlock[] = [];
  for (const r of primary.readings) {
    const html = await resolveReadingText(supabase, translation, r.citation);
    readings.push({
      heading: humanizeSlot(r.slot),
      citation: r.citation || null,
      summary: null,
      html,
    });
  }

  return {
    date,
    sourceUrl: APP_SOURCE_URL,
    liturgicalTitle: primary.name ?? null,
    readings,
  };
}
