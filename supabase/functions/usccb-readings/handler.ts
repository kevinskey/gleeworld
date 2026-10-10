// Pure mapping from prayer_day_full()'s JSON shape to the usccb-readings
// response contract. Kept separate from index.ts (which calls serve() at
// module scope) so it can be unit-tested under Vitest with a plain object,
// no live Supabase client and no Deno listener.
//
// Phase 1 (docs/superpowers/plans/2026-08-04-prayer-phase1.md), Task 4.

export interface VerseRow {
  chapter: number;
  verse: number;
  text: string;
}

export interface ReadingRow {
  slot: string;
  citation: string | null;
  schema_label: string;
  source: string;
  verses: VerseRow[];
}

export interface CalendarEvent {
  event_key: string;
  name: string;
  rank_grade: number | null;
  readings: ReadingRow[];
}

/** The prayer_day_full(date, rite, translation) RPC's return shape. */
export interface PrayerDayFull {
  date: string;
  rite: string;
  translation: string;
  attribution: string | null;
  events: CalendarEvent[];
}

export interface ReadingBlock {
  heading: string;
  citation: string | null;
  summary: string | null;
  html: string;
}

/**
 * The response contract deployed iOS clients already call. Field names and
 * types must not change; `attribution` is new and purely additive, so an
 * older client that does not know about it is unaffected.
 */
export interface ReadingsResponse {
  date: string;
  sourceUrl: string;
  liturgicalTitle: string | null;
  attribution: string | null;
  readings: ReadingBlock[];
}

const SLOT_HEADINGS: Record<string, string> = {
  first_reading: 'First Reading',
  responsorial_psalm: 'Responsorial Psalm',
  second_reading: 'Second Reading',
  gospel_acclamation: 'Gospel Acclamation',
  gospel: 'Gospel',
  palm_gospel: 'Gospel',
  epistle: 'Epistle',
  note: 'Reading',
};

/** "third_reading" -> "Third Reading"; falls back for rare vigil-schema slots. */
function humanizeSlot(slot: string): string {
  if (SLOT_HEADINGS[slot]) return SLOT_HEADINGS[slot];
  return slot.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderVerses(verses: VerseRow[]): string {
  return verses.map((v) => `<p><sup>${v.verse}</sup> ${escapeHtml(v.text)}</p>`).join('');
}

/**
 * Maps a prayer_day_full() result onto the ReadingsResponse contract.
 *
 * `events` is already ordered highest-rank-first by the RPC (a date can carry
 * a feria plus an optional memorial); the first event is what Universalis'
 * mass.htm effectively showed, so it is the one this function surfaces.
 *
 * A reading with no resolved verses (unparsed citation, or an old row from
 * before the ranges backfill) still appears with its citation, just an empty
 * `html` — the frontend already renders that state (see ReadingsModal's
 * `data.readings.length === 0` branch for the whole-day case).
 */
export function buildReadingsResponse(day: PrayerDayFull, sourceUrl: string): ReadingsResponse {
  const event = day.events[0] ?? null;
  const readings = event?.readings ?? [];

  return {
    date: day.date,
    sourceUrl,
    liturgicalTitle: event?.name ?? null,
    attribution: day.attribution,
    readings: readings.map((r) => ({
      heading: humanizeSlot(r.slot),
      citation: r.citation,
      summary: null,
      html: r.verses.length ? renderVerses(r.verses) : '',
    })),
  };
}
