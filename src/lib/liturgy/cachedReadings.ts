import { supabase } from '@/integrations/supabase/client';

/**
 * The day's readings out of the local USCCB table.
 *
 * Universalis publishes only about a week either side of today and redirects
 * everything else, so any date further out came back "not posted yet" — which
 * is most of what a planner is for. `usccb_readings` holds dates taken from the
 * USCCB lectionary, which publishes the whole liturgical year.
 *
 * Shaped into the same block array the `usccb-readings` edge function returns
 * so callers can treat cache and proxy identically and keep one render path.
 *
 * Returns null when the date isn't cached; callers fall back to the proxy,
 * which still covers near dates and the weekdays the backfill skipped.
 */

export interface CachedReadingBlock {
  heading: string;
  citation: string | null;
  summary?: string | null;
  html: string;
}

export interface CachedReadings {
  liturgicalTitle: string | null;
  /** A/B/C off the lectionary — authoritative across the Advent boundary. */
  cycle: string | null;
  blocks: CachedReadingBlock[];
  sourceUrl: string | null;
}

export async function readingsFromCache(iso: string): Promise<CachedReadings | null> {
  // usccb_readings predates the generated types; cast at this boundary only.
  const { data, error } = await (supabase as any)
    .from('usccb_readings')
    .select('liturgical_day, year_cycle, first_reading, first_reading_reference,'
          + ' responsorial_psalm, psalm_response, psalm_text, second_reading,'
          + ' second_reading_reference, gospel_acclamation, gospel,'
          + ' gospel_reference, source_url')
    .eq('liturgical_date', iso)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const blocks: CachedReadingBlock[] = ([
    { heading: 'First Reading',      citation: data.first_reading_reference,  html: data.first_reading },
    // Prefer the full psalm; the refrain alone is not something to sing from.
    { heading: 'Responsorial Psalm', citation: data.responsorial_psalm,       html: data.psalm_text || data.psalm_response },
    { heading: 'Second Reading',     citation: data.second_reading_reference, html: data.second_reading },
    { heading: 'Gospel Acclamation', citation: data.gospel_acclamation,       html: null },
    { heading: 'Gospel',             citation: data.gospel_reference,         html: data.gospel },
  ] as Array<{ heading: string; citation: string | null; html: string | null }>)
    .filter((b) => b.citation || b.html)
    .map((b) => ({
      heading: b.heading,
      citation: b.citation ?? null,
      // Stored as plain text with real newlines; the readings panel renders
      // HTML, so keep the line breaks visible rather than collapsing them.
      html: b.html ? escapeToParagraphs(b.html) : '',
    }));

  if (!blocks.length) return null;

  return {
    liturgicalTitle: (data.liturgical_day as string) ?? null,
    cycle: (data.year_cycle as string) ?? null,
    blocks,
    sourceUrl: (data.source_url as string) ?? null,
  };
}

/** Plain text → escaped paragraphs, so stored newlines survive HTML rendering. */
function escapeToParagraphs(text: string): string {
  const esc = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return esc
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${line}</p>`)
    .join('');
}
