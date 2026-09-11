// Composes the day's readings from local Prayer-module reference data
// (docs/superpowers/plans/2026-08-04-prayer-phase1.md, Task 4) instead of
// scraping universalis.com at request time.
//
// Citation parsing has exactly one implementation, src/lib/prayer/citation.ts
// (Phase 1, Task 2) — this module imports it directly rather than
// re-implementing range resolution in SQL or duplicating it here. That file
// and its one dependency (./books.ts) use explicit `.ts` extensions on their
// relative imports specifically so Deno — which requires them — can load them
// unmodified; `allowImportingTsExtensions` in tsconfig.app.json keeps that
// safe for the Vite/Vitest side too.
//
// Kept separate from index.ts (which owns Deno's `serve()` and `Deno.env`) so
// this composition logic is importable and unit-testable under Vitest,
// matching the supabase/functions/event-share/runShare.ts pattern.

import { parseCitation } from '../../../src/lib/prayer/citation.ts';

export interface PrayerReadingCitation {
  slot: string;
  citation: string;
  schema_label: string;
}

export interface PrayerEvent {
  event_key: string;
  name: string;
  rank_grade: number | null;
  rank_label: string | null;
  color: string[];
  liturgical_season: string | null;
  sunday_cycle: string | null;
  psalter_week: number | null;
  is_holy_day_of_obligation: boolean;
  readings: PrayerReadingCitation[];
}

export interface PrayerDayResult {
  date: string;
  rite: string;
  events: PrayerEvent[];
}

export interface PrayerVerse {
  chapter: number;
  verse: number;
  text: string;
}

export interface ReadingTextResult {
  translation: string;
  attribution: string | null;
  verses: PrayerVerse[];
}

// The response contract deployed iOS clients already depend on. Unchanged
// from the scraping implementation — see ReadingsModal.tsx's ReadingsResp.
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
  error?: string;
  outOfRange?: boolean;
}

export interface SupabaseRpcClient {
  rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: { message: string } | null }>;
}

const SLOT_HEADINGS: Record<string, string> = {
  first_reading: 'First Reading',
  responsorial_psalm: 'Responsorial Psalm',
  second_reading: 'Second Reading',
  gospel_acclamation: 'Gospel Acclamation',
  gospel: 'Gospel',
  epistle: 'Epistle',
  note: 'Note',
};

/** "third_reading" -> "Third Reading" for the rare slots not in the map above. */
export function humanizeSlot(slot: string): string {
  if (SLOT_HEADINGS[slot]) return SLOT_HEADINGS[slot];
  return slot
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Renders resolved verses as the sanitizeHtml-allowlisted markup
 * ReadingsModal already knows how to display (p/em survive its p/br/em/
 * strong/i/b/u/blockquote/span allowlist), each verse text escaped, with a
 * trailing attribution line naming the translation — required per the
 * design doc's WEBCE trademark note and Phase 1's half-verse-precision risk.
 */
export function renderVersesHtml(verses: PrayerVerse[], attribution: string | null): string {
  if (!verses.length) return '';
  const body = verses.map((v) => `<p><sup>${v.verse}</sup> ${escapeHtml(v.text)}</p>`).join('');
  const attr = attribution ? `<p><em>${escapeHtml(attribution)}</em></p>` : '';
  return body + attr;
}

/**
 * USCCB's own daily-readings page for the date — the same URL
 * src/lib/liturgy/calendar.ts's usccbReadingsUrl() computes, duplicated here
 * (rather than imported) because that module pulls in unrelated liturgy-page
 * code not meant for a Deno runtime. A real, stable link to the official
 * lectionary, not the scraped site we just stopped depending on.
 */
export function usccbSourceUrl(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `https://bible.usccb.org/bible/readings/${m}${d}${y.slice(2)}.cfm`;
}

function buildReadingBlock(reading: PrayerReadingCitation, text: ReadingTextResult | null): ReadingBlock {
  return {
    heading: humanizeSlot(reading.slot),
    citation: reading.citation,
    // We no longer scrape a title line from a page; never fabricate one.
    summary: null,
    html: text ? renderVersesHtml(text.verses, text.attribution) : '',
  };
}

async function resolveReadingText(
  supabase: SupabaseRpcClient,
  translation: string,
  citation: string,
): Promise<ReadingTextResult | null> {
  const parsed = parseCitation(citation);
  // No resolvable book (a "note" slot like "From the Common of the Blessed
  // Virgin Mary") or nothing but letter-chapter ranges we can't look up:
  // degrade to a citation-only block rather than erroring, same as
  // prayer_reading_text() does for a range it can't resolve.
  if (!parsed.usfmCode || parsed.ranges.length === 0) return null;

  const { data, error } = await supabase.rpc('prayer_reading_text', {
    p_translation: translation,
    p_usfm: parsed.usfmCode,
    p_ranges: parsed.ranges,
  });
  if (error) throw new Error(`prayer_reading_text: ${error.message}`);
  return data as ReadingTextResult;
}

export interface GetReadingsOptions {
  rite?: string;
  translation?: string;
}

/**
 * The day's readings, resolved to actual scripture text from our own
 * gw_bible_verses (WEBCE, public domain) — replaces the old fetch(universalis…)
 * + HTML scrape. Same response contract: { date, sourceUrl, liturgicalTitle,
 * readings: [{ heading, citation, summary, html }] }.
 */
export async function getReadingsForDate(
  supabase: SupabaseRpcClient,
  date: string,
  opts: GetReadingsOptions = {},
): Promise<RespOk> {
  const rite = opts.rite ?? 'roman_catholic';
  const translation = opts.translation ?? 'WEBCE';
  const sourceUrl = usccbSourceUrl(date);

  const { data: dayData, error: dayError } = await supabase.rpc('prayer_day', { p_date: date, p_rite: rite });
  if (dayError) throw new Error(`prayer_day: ${dayError.message}`);
  const day = dayData as PrayerDayResult;

  // prayer_day() orders events by rank, highest first (20260804140000_prayer_day_rpc.sql) —
  // the first event is the celebration actually observed on this date.
  const topEvent = day.events[0] ?? null;
  if (!topEvent) {
    return {
      date,
      sourceUrl,
      liturgicalTitle: null,
      readings: [],
      error: 'No liturgical calendar data for this date.',
      outOfRange: true,
    };
  }

  const readings: ReadingBlock[] = [];
  for (const reading of topEvent.readings) {
    const text = await resolveReadingText(supabase, translation, reading.citation);
    readings.push(buildReadingBlock(reading, text));
  }

  return {
    date,
    sourceUrl,
    liturgicalTitle: topEvent.name,
    readings,
  };
}
