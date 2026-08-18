/**
 * Assembles the `usccb-readings` response entirely from our own data:
 * `prayer_day()` for the calendar + citations (Phase 0), `parseCitation()`
 * for citation -> verse-range resolution (Phase 1, ported into
 * `_shared/prayer/citation.ts` because Deno can't import across the
 * `supabase/functions/` deploy boundary), and `prayer_reading_text()` to
 * resolve those ranges against the public-domain WEBCE text (Phase 1).
 *
 * No outbound HTTP request. Replaces the previous implementation, which
 * scraped universalis.com at request time — see the PR that introduced this
 * file for why that was a licensing, fragility, and completeness problem.
 *
 * The response shape is unchanged from the scraping implementation:
 * `{ date, sourceUrl, liturgicalTitle, readings: [{ heading, citation,
 * summary, html }], error?, outOfRange? }`. Deployed iOS clients call this
 * function and read that shape; `error`/`outOfRange` are kept for parity
 * even though their cause is now "not imported" rather than "not yet
 * published by Universalis."
 */

import { parseCitation, type VerseRange } from '../_shared/prayer/citation.ts';

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
  error?: string;
  outOfRange?: boolean;
}

export const NO_CALENDAR_DATA =
  'No liturgical calendar data is imported for this date yet.';

interface PrayerReadingRow {
  slot: string;
  citation: string;
  schema_label: string;
}

interface PrayerDayEvent {
  event_key: string;
  name: string;
  rank_grade: number | null;
  readings: PrayerReadingRow[];
}

interface PrayerDayResult {
  date: string;
  rite: string;
  events: PrayerDayEvent[];
}

interface PrayerReadingTextResult {
  translation: string;
  attribution: string | null;
  verses: { chapter: number; verse: number; text: string }[];
}

/** Minimal shape of the Supabase client this module actually calls. */
export interface RpcClient {
  rpc(
    fn: 'prayer_day',
    args: { p_date: string; p_rite: string },
  ): Promise<{ data: PrayerDayResult | null; error: { message: string } | null }>;
  rpc(
    fn: 'prayer_reading_text',
    args: { p_translation: string; p_usfm: string; p_ranges: VerseRange[] },
  ): Promise<{ data: PrayerReadingTextResult | null; error: { message: string } | null }>;
}

const HEADINGS: Record<string, string> = {
  first_reading: 'First Reading',
  responsorial_psalm: 'Responsorial Psalm',
  second_reading: 'Second Reading',
  third_reading: 'Third Reading',
  fourth_reading: 'Fourth Reading',
  fifth_reading: 'Fifth Reading',
  sixth_reading: 'Sixth Reading',
  seventh_reading: 'Seventh Reading',
  gospel_acclamation: 'Gospel Acclamation',
  gospel: 'Gospel',
  palm_gospel: 'Gospel at the Procession',
  epistle: 'Epistle',
  note: 'Note',
};

function humanizeSlot(slot: string): string {
  if (HEADINGS[slot]) return HEADINGS[slot];
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

function verseText(verses: PrayerReadingTextResult['verses']): string {
  return verses
    .map((v) => `<p><sup>${v.verse}</sup> ${escapeHtml(v.text)}</p>`)
    .join('');
}

const TRANSLATION = 'WEBCE';

/** citation.ts's ranges include unresolvable letter-chapter entries as
 * {startChapter: null, ...}; prayer_reading_text drops those server-side, so
 * they don't need filtering here — passing them through is harmless. */
async function resolveReading(
  client: RpcClient,
  row: PrayerReadingRow,
): Promise<ReadingBlock> {
  const heading = humanizeSlot(row.slot);

  if (row.slot === 'note') {
    // LitCal's string-valued `readings` field ("From the Common of the
    // Blessed Virgin Mary") — not a scriptural citation, nothing to resolve.
    return { heading, citation: null, summary: null, html: `<p>${escapeHtml(row.citation)}</p>` };
  }

  const parsed = parseCitation(row.citation);
  if (!parsed.usfmCode || parsed.ranges.length === 0) {
    // Couldn't resolve this citation (unmapped book name, or a segment that
    // didn't parse). Degrade to showing the citation with no body rather
    // than dropping the reading or throwing.
    return { heading, citation: row.citation, summary: null, html: '' };
  }

  const { data, error } = await client.rpc('prayer_reading_text', {
    p_translation: TRANSLATION,
    p_usfm: parsed.usfmCode,
    p_ranges: parsed.ranges,
  });
  if (error || !data || data.verses.length === 0) {
    return { heading, citation: row.citation, summary: null, html: '' };
  }

  const attribution = data.attribution
    ? `<p><em>${escapeHtml(data.attribution)}</em></p>`
    : '';
  return {
    heading,
    citation: row.citation,
    summary: null,
    html: verseText(data.verses) + attribution,
  };
}

export async function buildReadings(
  client: RpcClient,
  date: string,
  rite = 'roman_catholic',
): Promise<ReadingsResp> {
  const sourceUrl = `https://gleeworld.org/prayer/${date}`;

  const { data: day, error } = await client.rpc('prayer_day', { p_date: date, p_rite: rite });
  if (error) {
    return { date, sourceUrl, liturgicalTitle: null, readings: [], error: error.message };
  }
  if (!day || day.events.length === 0) {
    return {
      date,
      sourceUrl,
      liturgicalTitle: null,
      readings: [],
      error: NO_CALENDAR_DATA,
      outOfRange: true,
    };
  }

  // prayer_day() already orders events by rank_grade DESC — the primary
  // celebration (over an optional memorial, say) comes first.
  const primary = day.events[0];
  const readings = await Promise.all(primary.readings.map((r) => resolveReading(client, r)));

  return {
    date,
    sourceUrl,
    liturgicalTitle: primary.name,
    readings,
  };
}
