// Composes the day's Mass readings from GleeWorld's own reference data —
// public-domain WEBCE scripture (src/lib/prayer, Phase 0/1 of the Prayer
// module: docs/superpowers/plans/2026-08-04-prayer-phase0.md and -phase1.md)
// — instead of scraping universalis.com at request time. See index.ts's
// header comment for why the scrape existed and why it had to go.
//
// Pure and injectable (takes a `supabase` client as a parameter, never
// constructs one) so it can be unit-tested against a stub client without a
// network or a database. See __tests__/contract.test.ts.

import { parseCitation } from '../_shared/prayer/citation.ts';

export interface ReadingBlock {
  heading: string;
  citation: string | null;
  summary: string | null;
  html: string;
}

export interface ReadingsResponse {
  date: string;
  sourceUrl: string;
  liturgicalTitle: string | null;
  readings: ReadingBlock[];
  /** Present only when there is no calendar data at all for this date. */
  error?: string;
  outOfRange?: boolean;
}

export const NO_CALENDAR_DATA =
  'No calendar data for this date yet. GleeWorld imports the liturgical calendar for 2020–2035.';

export interface SupabaseRpcClient {
  rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: { message: string } | null }>;
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
  rank_label: string | null;
  color: string[];
  liturgical_season: string | null;
  sunday_cycle: string | null;
  psalter_week: number | null;
  is_holy_day_of_obligation: boolean;
  readings: PrayerDayReading[];
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

const SLOT_HEADINGS: Record<string, string> = {
  first_reading: 'First Reading',
  responsorial_psalm: 'Responsorial Psalm',
  second_reading: 'Second Reading',
  gospel_acclamation: 'Gospel Acclamation',
  gospel: 'Gospel',
  epistle: 'Epistle',
  palm_gospel: 'Gospel',
  note: 'Reading',
};

function humanizeSlot(slot: string): string {
  if (SLOT_HEADINGS[slot]) return SLOT_HEADINGS[slot];
  return slot
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderVersesHtml(
  verses: PrayerReadingTextResult['verses'],
  attribution: string | null,
): string {
  if (!verses.length) return '';
  const body = verses
    .map((v) => `<p><sup>${v.verse}</sup> ${escapeHtml(v.text)}</p>`)
    .join('');
  const attr = attribution ? `<p><em>${escapeHtml(attribution)}</em></p>` : '';
  return body + attr;
}

/**
 * @param date YYYY-MM-DD
 * @param supabase A client exposing just `.rpc()` — the real edge function
 *   passes a full supabase-js client; tests pass a stub.
 */
export async function buildReadingsResponse(
  date: string,
  supabase: SupabaseRpcClient,
): Promise<ReadingsResponse> {
  const sourceUrl = `https://gleeworld.org/prayer?date=${date}`;

  const { data: dayData, error: dayErr } = await supabase.rpc('prayer_day', {
    p_date: date,
    p_rite: 'roman_catholic',
  });
  if (dayErr) throw new Error(`prayer_day(${date}): ${dayErr.message}`);

  const day = dayData as PrayerDayResult | null;
  const events = day?.events ?? [];
  if (events.length === 0) {
    return {
      date,
      sourceUrl,
      liturgicalTitle: null,
      readings: [],
      error: NO_CALENDAR_DATA,
      outOfRange: true,
    };
  }

  // prayer_day() already orders events by rank_grade DESC, so the first
  // event is the day's principal celebration — the one Mass a single reader
  // expects, matching what a single Universalis mass.htm page used to show.
  const primary = events[0];

  const readings: ReadingBlock[] = [];
  for (const r of primary.readings) {
    const heading = humanizeSlot(r.slot);

    // "note"-slot readings ("From the Common of the Blessed Virgin Mary")
    // have no scripture citation to resolve — surface the note as-is.
    if (r.slot === 'note') {
      readings.push({ heading, citation: r.citation, summary: null, html: '' });
      continue;
    }

    const parsed = parseCitation(r.citation);
    let html = '';
    if (parsed.usfmCode && parsed.ranges.length) {
      const { data: textData, error: textErr } = await supabase.rpc('prayer_reading_text', {
        p_translation: 'WEBCE',
        p_usfm: parsed.usfmCode,
        p_ranges: parsed.ranges,
      });
      if (textErr) {
        throw new Error(`prayer_reading_text(${r.citation}): ${textErr.message}`);
      }
      const text = textData as PrayerReadingTextResult | null;
      html = renderVersesHtml(text?.verses ?? [], text?.attribution ?? null);
    }

    readings.push({ heading, citation: r.citation, summary: null, html });
  }

  return {
    date,
    sourceUrl,
    liturgicalTitle: primary.name ?? null,
    readings,
  };
}
