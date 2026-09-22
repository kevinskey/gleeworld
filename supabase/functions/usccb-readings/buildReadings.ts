// Composes prayer_day() + prayer_reading_text() — both from Phase 0/1 of the
// Prayer module (docs/superpowers/plans/2026-08-04-prayer-phase*.md) — into
// the exact response shape usccb-readings has always returned, so deployed
// clients keep working while the source moves from a live Universalis scrape
// to our own liturgical-calendar + WEBCE reference tables.
//
// Deviation from the Phase 1 plan's Task 3: no `prayer_day_full` SQL RPC was
// added. That function's signature in the plan (date, rite, translation —
// no citation or ranges parameter) has no way to receive parsed verse
// ranges, so resolving citations to text *inside* it would mean
// reimplementing parseCitation()'s rules a second time in plpgsql — exactly
// the duplication the plan's own architecture note rules out ("citation
// parsing lives in exactly one place: citation.ts"). Composing prayer_day()
// with prayer_reading_text() here, in the one runtime that can import the
// TypeScript parser directly, keeps that invariant literally true instead of
// merely declared.

import { parseCitation } from '../../../src/lib/prayer/citation.ts';

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

interface RpcResult<T> {
  data: T | null;
  error: { message: string } | null;
}

interface PrayerDayResult {
  events?: CalendarEvent[];
}

interface PrayerReadingTextResult {
  attribution?: string | null;
  verses?: VerseRow[];
}

/** The slice of the supabase-js client this module actually calls. */
export interface SupabaseLike {
  rpc(
    fn: 'prayer_day',
    args: { p_date: string; p_rite: string },
  ): Promise<RpcResult<PrayerDayResult>>;
  rpc(
    fn: 'prayer_reading_text',
    args: { p_translation: string; p_usfm: string; p_ranges: unknown },
  ): Promise<RpcResult<PrayerReadingTextResult>>;
}

interface CalendarReading {
  slot: string;
  citation: string;
  schema_label?: string;
}

interface CalendarEvent {
  name: string;
  readings: CalendarReading[];
}

interface VerseRow {
  chapter: number;
  verse: number;
  text: string;
}

// The upstream data covers 2026 and 2027 only (see the Phase 0 plan's
// "Verified findings"), and a small number of ferial weekdays a year have no
// citation even inside that window. Both look identical from here: a date
// with nothing to show. Kept as `outOfRange: true` so the frontend's existing
// "not published yet" (calm, non-error) styling in ReadingsModal still fires.
const NOT_IMPORTED_MESSAGE =
  "Readings for this date haven't been imported yet. Check back closer to the day.";

const SLOT_HEADINGS: Record<string, string> = {
  first_reading: 'First Reading',
  responsorial_psalm: 'Responsorial Psalm',
  second_reading: 'Second Reading',
  gospel_acclamation: 'Gospel Acclamation',
  gospel: 'Gospel',
  note: 'Note',
};

function humanizeSlot(slot: string): string {
  return (
    SLOT_HEADINGS[slot] ??
    slot
      .split('_')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
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

function emptyResponse(date: string, sourceUrl: string, liturgicalTitle: string | null = null): ReadingsResp {
  return {
    date,
    sourceUrl,
    liturgicalTitle,
    readings: [],
    error: NOT_IMPORTED_MESSAGE,
    outOfRange: true,
  };
}

/** citation-only fallback: an unresolvable or empty-result reading still
 * shows its citation (as the old Universalis path did for the Responsorial
 * Psalm before this phase), just with no verse body. */
function citationOnlyBlock(heading: string, citation: string): ReadingBlock {
  return { heading, citation: citation || null, summary: null, html: '' };
}

export interface BuildReadingsOptions {
  rite?: string;
  translation?: string;
  sourceUrl?: string;
}

export async function buildReadingsResponse(
  date: string,
  supabase: SupabaseLike,
  opts: BuildReadingsOptions = {},
): Promise<ReadingsResp> {
  const rite = opts.rite ?? 'roman_catholic';
  const translation = opts.translation ?? 'WEBCE';
  const sourceUrl = opts.sourceUrl ?? 'https://gleeworld.org';

  const { data: day, error: dayErr } = await supabase.rpc('prayer_day', { p_date: date, p_rite: rite });
  if (dayErr) throw new Error(`prayer_day: ${dayErr.message}`);

  const events: CalendarEvent[] = day?.events ?? [];
  if (events.length === 0) return emptyResponse(date, sourceUrl);

  // prayer_day() already orders events by rank_grade DESC — the highest-
  // ranked celebration on the date (a feast/memorial over the plain feria).
  // Only one Universalis page was ever shown per date, so this preserves
  // that same "one set of readings per day" behaviour.
  const top = events[0];
  const readingsIn = top.readings ?? [];
  if (readingsIn.length === 0) return emptyResponse(date, sourceUrl, top.name);

  const readings: ReadingBlock[] = [];
  for (const reading of readingsIn) {
    const heading = humanizeSlot(reading.slot);
    const parsed = parseCitation(reading.citation);

    if (!parsed.usfmCode || parsed.ranges.length === 0) {
      readings.push(citationOnlyBlock(heading, reading.citation));
      continue;
    }

    const { data: resolved, error: rErr } = await supabase.rpc('prayer_reading_text', {
      p_translation: translation,
      p_usfm: parsed.usfmCode,
      p_ranges: parsed.ranges,
    });

    const verses: VerseRow[] = !rErr && resolved?.verses ? resolved.verses : [];
    if (verses.length === 0) {
      readings.push(citationOnlyBlock(heading, reading.citation));
      continue;
    }

    const attribution: string | null = resolved?.attribution ?? null;
    const html =
      verses.map((v) => `<p><sup>${v.chapter}:${v.verse}</sup> ${escapeHtml(v.text)}</p>`).join('') +
      (attribution ? `<p><em>${escapeHtml(attribution)}</em></p>` : '');

    readings.push({ heading, citation: reading.citation || null, summary: null, html });
  }

  return { date, sourceUrl, liturgicalTitle: top.name, readings };
}
