// Phase 1 (docs/superpowers/plans/2026-08-04-prayer-phase1.md), Task 4.
//
// Composes the two Phase 0/1 RPCs — prayer_day() and prayer_reading_text() —
// into the exact response shape the `usccb-readings` name has always
// returned, but sourced from our own WEBCE-backed tables instead of a
// runtime scrape of universalis.com.
//
// Citation parsing lives in exactly one place, src/lib/prayer/citation.ts
// (see the Phase 1 plan's File Structure table) — this module imports it
// directly rather than re-implementing it here or pushing that logic into
// SQL. NOTE FOR REVIEWERS: this is the first Edge Function in the repo to
// import across the supabase/functions boundary into src/lib. It resolves
// correctly under Vite/vitest (verified: this file's own tests pass) and
// Deno does support walking relative imports outside a function's own
// directory when bundling for deploy, but that path could not be exercised
// end-to-end in this sandboxed session (no Deno CLI, no Supabase project
// access). Please confirm a real `supabase functions deploy` succeeds
// before this merges.
import { parseCitation, type VerseRange } from '../../../src/lib/prayer/citation.ts';

export interface ReadingBlock {
  heading: string;
  citation: string | null;
  summary: string | null;
  html: string;
}

export interface ReadingsResp {
  date: string;
  sourceUrl: string;
  liturgicalTitle: string | null;
  readings: ReadingBlock[];
}

export interface ReadingsErrorResp {
  date: string;
  sourceUrl: string;
  liturgicalTitle: null;
  readings: [];
  error: string;
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
  source: string;
}

interface PrayerDayEvent {
  event_key: string;
  name: string;
  rank_grade: number | null;
  readings: PrayerDayReading[];
}

interface PrayerDayResult {
  date: string;
  rite: string;
  events: PrayerDayEvent[];
}

interface PrayerReadingTextVerse {
  chapter: number;
  verse: number;
  text: string;
}

interface PrayerReadingTextResult {
  translation: string;
  attribution: string | null;
  verses: PrayerReadingTextVerse[];
}

// Placeholder for the eventual Prayer "Today" screen (Phase 2+). There is no
// live route yet, so this does not point at a real page — it only replaces
// a URL that pointed at a third-party site whose content we no longer serve.
const APP_BASE_URL = 'https://gleeworld.org/prayer/readings';

export async function buildReadings(
  date: string,
  supabase: SupabaseRpcClient,
): Promise<ReadingsResp | ReadingsErrorResp> {
  const sourceUrl = `${APP_BASE_URL}/${date}`;

  const { data: dayData, error: dayErr } = await supabase.rpc('prayer_day', {
    p_date: date,
    p_rite: 'roman_catholic',
  });
  if (dayErr) throw new Error(`prayer_day: ${dayErr.message}`);

  const day = dayData as PrayerDayResult;
  const events = day?.events ?? [];
  if (!events.length) {
    return {
      date,
      sourceUrl,
      liturgicalTitle: null,
      readings: [],
      error: 'No readings are catalogued for this date yet.',
      outOfRange: true,
    };
  }

  // prayer_day() already orders events by rank_grade DESC, so the first
  // event is the highest-ranked celebration for the date.
  const top = events[0];
  const readingRows = top.readings ?? [];

  const readings: ReadingBlock[] = [];
  for (const row of readingRows) {
    const heading = humanizeSlot(row.slot);
    const parsed = parseCitation(row.citation);

    if (!parsed.usfmCode || parsed.ranges.length === 0) {
      // Citation-only note (e.g. "From the Common of the Blessed Virgin
      // Mary") or a citation the parser could not resolve to a book. Same
      // fallback the previous implementation used for a citation with no
      // body: show the citation, no reading text.
      readings.push({ heading, citation: row.citation, summary: null, html: '' });
      continue;
    }

    const { data: textData, error: textErr } = await supabase.rpc('prayer_reading_text', {
      p_translation: 'WEBCE',
      p_usfm: parsed.usfmCode,
      p_ranges: parsed.ranges as unknown as VerseRange[],
    });
    if (textErr) throw new Error(`prayer_reading_text ${row.slot}: ${textErr.message}`);

    const text = textData as PrayerReadingTextResult;
    readings.push({
      heading,
      citation: row.citation,
      // We no longer scrape a title line from a third-party page; nothing
      // stands in for it rather than fabricating one.
      summary: null,
      html: renderVersesHtml(text?.verses ?? [], text?.attribution ?? null),
    });
  }

  return { date, sourceUrl, liturgicalTitle: top.name ?? null, readings };
}

function humanizeSlot(slot: string): string {
  return slot
    .split('_')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderVersesHtml(verses: PrayerReadingTextVerse[], attribution: string | null): string {
  if (!verses.length) return '';
  const body = verses
    .map((v) => `<p><sup>${v.verse}</sup> ${escapeHtml(v.text)}</p>`)
    .join('');
  const attr = attribution ? `<p><em>${escapeHtml(attribution)}</em></p>` : '';
  return body + attr;
}
