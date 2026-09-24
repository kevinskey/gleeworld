// Pure response-shaping logic for the usccb-readings edge function, split out
// of index.ts so it can be unit-tested under Vitest/Node — index.ts itself
// imports `jsr:@supabase/supabase-js@2` and calls Deno.serve, neither of
// which Vitest can load (see supabase/functions/_shared/liturgy/__tests__ for
// the repo's established pattern of testing pure logic instead of the
// handler). This file has no Deno-only import, so it is also directly
// importable from index.ts at runtime — one implementation, not a port.

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

export interface VerseRow {
  chapter: number;
  verse: number;
  text: string;
}

export interface ReadingInput {
  slot: string;
  citation: string;
  schemaLabel: string;
  verses: VerseRow[];
  attribution: string | null;
}

const SLOT_LABELS: Record<string, string> = {
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
  // The ~21 events/year where LitCal's own `readings` field is a plain
  // string ("From the Common of the Blessed Virgin Mary") rather than a
  // dict — see src/lib/prayer/litcal.ts. It has no citation to resolve.
  note: 'Reading',
};

function titleCaseWords(s: string): string {
  return s
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** "first_reading" -> "First Reading"; an unrecognised slot degrades to title case rather than throwing. */
export function humanizeSlot(slot: string): string {
  return SLOT_LABELS[slot] ?? (titleCaseWords(slot) || slot);
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
 * Renders resolved WEBCE verses as the same p/sup markup ReadingsModal's
 * allowlist sanitizer already expects, plus a trailing attribution line.
 * A chapter marker appears only when the range crosses a chapter boundary
 * (e.g. "Acts 7:51—8:1a"), never on a single-chapter reading.
 */
export function renderVersesHtml(verses: VerseRow[], attribution: string | null): string {
  if (verses.length === 0) return '';

  let html = '';
  let lastChapter: number | null = null;
  for (const v of verses) {
    if (v.chapter !== lastChapter) {
      if (lastChapter !== null) html += `<p><strong>Chapter ${v.chapter}</strong></p>`;
      lastChapter = v.chapter;
    }
    html += `<p><sup>${v.verse}</sup> ${escapeHtml(v.text)}</p>`;
  }
  if (attribution) html += `<p><em>${escapeHtml(attribution)}</em></p>`;
  return html;
}

function humanizeSchemaLabel(label: string): string {
  return titleCaseWords(label) || label;
}

/**
 * Composes the prayer_day() event name + per-reading verse text into the
 * exact response contract deployed iOS clients already expect:
 * { date, sourceUrl, liturgicalTitle, readings: [{heading, citation, summary, html}] }.
 * `summary` is always null — the old Universalis scrape's <h4> title line has
 * no equivalent in our own data, and Task 4 of the Phase 1 plan is explicit
 * that this must not be fabricated.
 */
export function buildReadingsResponse(
  date: string,
  sourceUrl: string,
  liturgicalTitle: string | null,
  readings: ReadingInput[],
): RespOk {
  return {
    date,
    sourceUrl,
    liturgicalTitle,
    readings: readings.map((r) => ({
      heading: r.schemaLabel
        ? `${humanizeSlot(r.slot)} (${humanizeSchemaLabel(r.schemaLabel)})`
        : humanizeSlot(r.slot),
      citation: r.citation,
      summary: null,
      html: renderVersesHtml(r.verses, r.attribution),
    })),
  };
}
