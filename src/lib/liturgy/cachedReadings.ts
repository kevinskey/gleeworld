import { supabase } from '@/integrations/supabase/client';

/**
 * The day's readings out of the local USCCB table.
 *
 * Universalis publishes only about a week either side of today and redirects
 * everything else, so any date further out came back "not posted yet" — which
 * is most of what a planner is for. `usccb_readings` holds dates taken from the
 * USCCB lectionary, which publishes the whole liturgical year.
 *
 * Some days carry more than one set: Christmas (Vigil, Night, Dawn, Day), the
 * Assumption, Pentecost, the Lenten Sundays (the cycle's own readings beside
 * the Year A scrutiny set), and the Ascension — which is a provincial choice,
 * kept on Thursday in six US provinces and moved to the Sunday everywhere
 * else, with USCCB publishing both sets on both dates. So all of them are
 * returned, ordered by a suggested rank, and the caller picks.
 *
 * Blocks are shaped like the `usccb-readings` edge function's response so cache
 * and proxy render through one path.
 */

export interface CachedReadingBlock {
  heading: string;
  citation: string | null;
  summary?: string | null;
  html: string;
}

export interface CachedVariant {
  /** Which Mass this is, when a day offers several. Null when it offers one. */
  label: string | null;
  /** Suggested order; 0 is offered first. Advisory — the diocese decides. */
  rank: number;
  liturgicalTitle: string | null;
  cycle: string | null;
  blocks: CachedReadingBlock[];
  sourceUrl: string | null;
}

const COLUMNS =
  'liturgical_day, year_cycle, variant_label, variant_rank, first_reading,'
  + ' first_reading_reference, responsorial_psalm, psalm_response, psalm_text,'
  + ' second_reading, second_reading_reference, gospel_acclamation, gospel,'
  + ' gospel_reference, source_url';

/** Every set of readings cached for a date, best-first. Empty if uncached. */
export async function readingsForDate(iso: string): Promise<CachedVariant[]> {
  // usccb_readings predates the generated types; cast at this boundary only.
  const { data, error } = await (supabase as any)
    .from('usccb_readings')
    .select(COLUMNS)
    .eq('liturgical_date', iso)
    .order('variant_rank', { ascending: true, nullsFirst: true });

  if (error || !data?.length) return [];

  return (data as any[])
    .map(toVariant)
    .filter((v): v is CachedVariant => v !== null);
}

/**
 * One set for a date: the one whose label was chosen, else the first offered.
 *
 * `preferLabel` is what the plan recorded. A stored choice that no longer
 * matches anything — a label USCCB has since reworded — falls back rather than
 * returning nothing, since no readings at all is the worse failure.
 */
export async function readingsFromCache(
  iso: string,
  preferLabel?: string | null,
): Promise<CachedVariant | null> {
  const variants = await readingsForDate(iso);
  if (!variants.length) return null;
  if (preferLabel) {
    const hit = variants.find((v) => v.label === preferLabel);
    if (hit) return hit;
  }
  return variants[0];
}

function toVariant(row: any): CachedVariant | null {
  const blocks: CachedReadingBlock[] = ([
    { heading: 'First Reading',      citation: row.first_reading_reference,  html: row.first_reading },
    // Prefer the whole psalm; the refrain alone is not something to sing from.
    { heading: 'Responsorial Psalm', citation: row.responsorial_psalm,       html: row.psalm_text || row.psalm_response },
    { heading: 'Second Reading',     citation: row.second_reading_reference, html: row.second_reading },
    { heading: 'Gospel Acclamation', citation: row.gospel_acclamation,       html: null },
    { heading: 'Gospel',             citation: row.gospel_reference,         html: row.gospel },
  ] as Array<{ heading: string; citation: string | null; html: string | null }>)
    .filter((b) => b.citation || b.html)
    .map((b) => ({
      heading: b.heading,
      citation: b.citation ?? null,
      // Stored as plain text with real newlines; the readings panel renders
      // HTML, so keep the line breaks rather than collapsing the whole reading
      // into one run-on block.
      html: b.html ? escapeToParagraphs(b.html) : '',
    }));

  if (!blocks.length) return null;
  return {
    label: (row.variant_label as string) ?? null,
    rank: typeof row.variant_rank === 'number' ? row.variant_rank : 0,
    liturgicalTitle: (row.liturgical_day as string) ?? null,
    cycle: (row.year_cycle as string) ?? null,
    blocks,
    sourceUrl: (row.source_url as string) ?? null,
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
