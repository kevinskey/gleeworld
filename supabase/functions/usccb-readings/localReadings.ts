// Builds the usccb-readings response from GleeWorld's own Prayer module data
// (Phase 0 calendar + WEBCE verses, Phase 1 citation parser) instead of
// scraping universalis.com.
//
// Citation parsing is deliberately imported from the single source of truth
// at src/lib/prayer/citation.ts rather than re-implemented here — both
// books.ts and citation.ts are dependency-free TypeScript (no Node/browser
// APIs), so Deno can load them directly via a relative import.
//
// docs/superpowers/plans/2026-08-04-prayer-phase1.md, Task 4.

import { parseCitation } from "../../../src/lib/prayer/citation.ts";

export interface ReadingBlock {
  heading: string;
  citation: string | null;
  summary: string | null;
  html: string;
}

export interface LocalReadingsResult {
  liturgicalTitle: string | null;
  readings: ReadingBlock[];
}

interface PrayerReadingRow {
  slot: string;
  citation: string;
  schema_label: string;
}

interface PrayerEventRow {
  event_key: string;
  name: string;
  rank_grade: number | null;
  readings: PrayerReadingRow[];
}

interface PrayerDayResult {
  events: PrayerEventRow[];
}

interface PrayerReadingTextResult {
  attribution: string | null;
  verses: { chapter: number; verse: number; text: string }[];
}

/** The minimal Supabase client surface this module needs — kept narrow so
 * it can be exercised with a plain mock in tests instead of a real client. */
export interface SupabaseClientLike {
  rpc(fn: string, args: Record<string, unknown>): Promise<{
    data: unknown;
    error: { message: string } | null;
  }>;
}

const SLOT_HEADINGS: Record<string, string> = {
  first_reading: "First Reading",
  responsorial_psalm: "Responsorial Psalm",
  second_reading: "Second Reading",
  gospel_acclamation: "Gospel Acclamation",
  gospel: "Gospel",
  note: "Reading",
  epistle: "Epistle",
  palm_gospel: "Gospel at the Procession",
};

function humanizeSlot(slot: string): string {
  return SLOT_HEADINGS[slot] ?? slot
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderVerses(
  verses: PrayerReadingTextResult["verses"],
  attribution: string | null,
): string {
  if (verses.length === 0) return "";
  const body = verses
    .map((v) => `<p><sup>${v.verse}</sup> ${escapeHtml(v.text)}</p>`)
    .join("");
  const attr = attribution ? `<p><em>${escapeHtml(attribution)}</em></p>` : "";
  return body + attr;
}

async function resolveReadingHtml(
  supabase: SupabaseClientLike,
  citation: string,
  translation: string,
): Promise<string> {
  const parsed = parseCitation(citation);
  if (!parsed.usfmCode || parsed.ranges.length === 0) return "";

  const { data, error } = await supabase.rpc("prayer_reading_text", {
    p_translation: translation,
    p_usfm: parsed.usfmCode,
    p_ranges: parsed.ranges,
  });
  if (error) throw new Error(`prayer_reading_text: ${error.message}`);

  const result = (data ?? { attribution: null, verses: [] }) as PrayerReadingTextResult;
  return renderVerses(result.verses ?? [], result.attribution ?? null);
}

/**
 * date is a plain YYYY-MM-DD string, already validated by the caller.
 * translation defaults to WEBCE, the only translation Phase 0 imported.
 */
export async function buildLocalReadings(
  supabase: SupabaseClientLike,
  date: string,
  translation = "WEBCE",
): Promise<LocalReadingsResult> {
  const { data, error } = await supabase.rpc("prayer_day", {
    p_date: date,
    p_rite: "roman_catholic",
  });
  if (error) throw new Error(`prayer_day: ${error.message}`);

  const day = (data ?? { events: [] }) as PrayerDayResult;
  const events = day.events ?? [];
  if (events.length === 0) return { liturgicalTitle: null, readings: [] };

  // prayer_day() already orders events by rank_grade DESC NULLS LAST, so the
  // first event is the one that takes precedence on this date (a feria plus
  // an optional memorial both appear; the memorial ranks higher).
  const event = events[0];

  const readings: ReadingBlock[] = [];
  for (const r of event.readings ?? []) {
    // "note" citations (e.g. "From the Common of the Blessed Virgin Mary")
    // have no book/verse to resolve — surface the citation with no body,
    // same as the old scraper did for citation-only entries.
    const html = r.slot === "note" ? "" : await resolveReadingHtml(supabase, r.citation, translation);
    readings.push({
      heading: humanizeSlot(r.slot),
      citation: r.citation,
      summary: null,
      html,
    });
  }

  return { liturgicalTitle: event.name ?? null, readings };
}
