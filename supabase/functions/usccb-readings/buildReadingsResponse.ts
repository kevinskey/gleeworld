// Pure response-building logic for usccb-readings, injected with an RPC
// caller so it can be unit-tested under Vitest/Node. Kept apart from
// index.ts because index.ts's serve() plus its deno.land URL import cannot
// be loaded outside Deno (same split as supabase/functions/ios-calendar-sync
// uses runSync.ts).

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
}

interface PrayerVerse {
  chapter: number;
  verse: number;
  text: string;
}

interface PrayerReading {
  slot: string;
  citation: string;
  schema_label: string;
  verses: PrayerVerse[];
  attribution: string | null;
}

interface PrayerEvent {
  name: string;
  rank_grade: number | null;
  readings: PrayerReading[];
}

interface PrayerDayFull {
  date: string;
  events: PrayerEvent[];
}

export interface RpcClient {
  rpc(
    fn: 'prayer_day_full',
    args: { p_date: string; p_rite: string; p_translation: string },
  ): Promise<{ data: PrayerDayFull | null; error: { message: string } | null }>;
}

const SLOT_LABELS: Record<string, string> = {
  first_reading: 'First Reading',
  responsorial_psalm: 'Responsorial Psalm',
  second_reading: 'Second Reading',
  gospel_acclamation: 'Gospel Acclamation',
  gospel: 'Gospel',
  note: 'Note',
};

function humanizeSlot(slot: string): string {
  return (
    SLOT_LABELS[slot] ??
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

// The user-visible win over the old Universalis scrape: the Responsorial
// Psalm used to be citation-only (Universalis strips its body on mass.htm).
// It now renders full verse text, from our own public-domain WEBCE data.
function readingHtml(reading: PrayerReading): string {
  if (!reading.verses.length) return '';
  const verses = reading.verses
    .map((v) => `<p><sup>${v.verse}</sup> ${escapeHtml(v.text)}</p>`)
    .join('');
  const attribution = reading.attribution
    ? `<p><em>${escapeHtml(reading.attribution)}</em></p>`
    : '';
  return verses + attribution;
}

export async function buildReadingsResponse(
  supabase: RpcClient,
  date: string,
  sourceUrl: string,
): Promise<ReadingsResponse> {
  const { data, error } = await supabase.rpc('prayer_day_full', {
    p_date: date,
    p_rite: 'roman_catholic',
    p_translation: 'WEBCE',
  });
  if (error) throw new Error(`prayer_day_full: ${error.message}`);

  const events = data?.events ?? [];
  if (events.length === 0) {
    return { date, sourceUrl, liturgicalTitle: null, readings: [] };
  }

  // prayer_day_full() already orders events by rank_grade DESC — the same
  // celebration a single Mass would use when a feria and an optional
  // memorial fall on the same date.
  const event = events[0];
  const readings: ReadingBlock[] = (event.readings ?? []).map((r) => ({
    heading: humanizeSlot(r.slot),
    citation: r.citation || null,
    summary: null,
    html: readingHtml(r),
  }));

  return { date, sourceUrl, liturgicalTitle: event.name ?? null, readings };
}
