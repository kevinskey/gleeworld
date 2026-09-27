import { supabase } from '@/integrations/supabase/client';
import { parseReference } from './reference';

/**
 * Fetch the text of a passage, without React.
 *
 * The Bible hooks are hooks, and live-voice tool callbacks are plain async
 * functions invoked by the ElevenLabs agent mid-conversation — there is no
 * component to hang a hook on. This is the same query in a callable form.
 *
 * It returns TEXT for the agent to speak, not components, and says plainly
 * when it cannot find something: the agent is instructed never to recite
 * scripture from memory, so an honest "not found" has to be available or it
 * will fill the gap itself.
 */

export const DEFAULT_TRANSLATION = 'WEBCE';

/** How many verses one lookup may return. A whole chapter is fine to speak;
 *  a whole book is not, and Psalm 119 alone is 176 verses. */
const MAX_VERSES = 60;

export interface PassageResult {
  ok: boolean;
  /** Human-readable, ready to speak. */
  text: string;
  reference?: string;
  translation?: string;
}

async function translationId(code: string): Promise<{ id: string; code: string } | null> {
  const { data } = await supabase
    .from('gw_bible_translations')
    .select('id, code')
    .ilike('code', code)
    .maybeSingle();
  return (data as { id: string; code: string } | null) ?? null;
}

/**
 * Look up a reference like "Psalm 23" or "John 3:16".
 *
 * Whole-chapter requests are capped rather than refused — a cantor asking for
 * Psalm 119 wants to hear it start, not be told no.
 */
export async function fetchPassage(
  reference: string,
  translationCode = DEFAULT_TRANSLATION,
): Promise<PassageResult> {
  const parsed = parseReference(reference);
  if (!parsed) {
    return { ok: false, text: `"${reference}" doesn't look like a scripture reference.` };
  }

  const tr = await translationId(translationCode) ?? await translationId(DEFAULT_TRANSLATION);
  if (!tr) return { ok: false, text: 'No Bible translations are loaded.' };

  const { data: book } = await supabase
    .from('gw_bible_books')
    .select('id, name')
    .eq('translation_id', tr.id)
    .eq('usfm_code', parsed.usfmCode)
    .maybeSingle();
  const b = book as { id: string; name: string } | null;
  if (!b) {
    // A real case, not a defensive branch: JPS1917 is the Tanakh, so any New
    // Testament book is genuinely absent from it.
    return { ok: false, text: `${tr.code} doesn't contain that book.` };
  }

  // A lectionary citation is a LIST of verse groups ("Psalm 25:4-5, 6-7,
  // 8-9", or "Ecclesiastes 11:9—12:8" across a chapter break), so each
  // segment is fetched on its own and skipped verses stay skipped.
  const rows: Array<{ chapter: number; verse: number; text: string }> = [];
  const labels: string[] = [];
  for (const seg of parsed.segments) {
    if (rows.length >= MAX_VERSES) break;
    let q = supabase
      .from('gw_bible_verses')
      .select('verse, text')
      .eq('book_id', b.id)
      .eq('chapter', seg.chapter)
      .order('verse')
      .limit(MAX_VERSES - rows.length);
    if (seg.verseStart != null) q = q.gte('verse', seg.verseStart);
    if (seg.verseEnd != null) q = q.lte('verse', seg.verseEnd);

    const { data: verses, error } = await q;
    if (error) return { ok: false, text: `Couldn't read that passage: ${error.message}` };
    const got = (verses ?? []) as Array<{ verse: number; text: string }>;
    if (got.length === 0) continue;

    rows.push(...got.map((r) => ({ chapter: seg.chapter, ...r })));
    labels.push(
      seg.verseStart == null
        ? `${seg.chapter}`
        : got.length === 1
          ? `${seg.chapter}:${got[0].verse}`
          : `${seg.chapter}:${got[0].verse}–${got[got.length - 1].verse}`,
    );
  }
  if (rows.length === 0) {
    return { ok: false, text: `${b.name} ${parsed.chapter} isn't in ${tr.code}.` };
  }

  const label = `${b.name} ${labels.join(', ')}`;
  // Verse numbers are omitted when a single verse was asked for — reading
  // "one" before a one-verse quotation sounds like a mistake aloud.
  const body = rows.length === 1
    ? rows[0].text
    : rows.map((r) => `${r.verse}. ${r.text}`).join(' ');

  return { ok: true, reference: label, translation: tr.code, text: `${label} (${tr.code}): ${body}` };
}

/** Search scripture for a phrase. */
export async function searchScripture(
  query: string,
  translationCode = DEFAULT_TRANSLATION,
  limit = 5,
): Promise<PassageResult> {
  const term = (query ?? '').trim();
  if (!term) return { ok: false, text: 'No search text was given.' };

  const tr = await translationId(translationCode) ?? await translationId(DEFAULT_TRANSLATION);
  if (!tr) return { ok: false, text: 'No Bible translations are loaded.' };

  const { data: books } = await supabase
    .from('gw_bible_books')
    .select('id, name')
    .eq('translation_id', tr.id);
  const byId = new Map((books ?? []).map((x) => [(x as { id: string }).id, (x as { name: string }).name]));
  if (byId.size === 0) return { ok: false, text: `${tr.code} has no books loaded.` };

  const { data, error } = await supabase
    .from('gw_bible_verses')
    .select('book_id, chapter, verse, text')
    .in('book_id', [...byId.keys()])
    .textSearch('search_tsv', term, { type: 'websearch' })
    .limit(limit);
  if (error) return { ok: false, text: `Search failed: ${error.message}` };

  const hits = (data ?? []) as Array<{ book_id: string; chapter: number; verse: number; text: string }>;
  if (hits.length === 0) return { ok: false, text: `Nothing in ${tr.code} matches "${term}".` };

  return {
    ok: true,
    translation: tr.code,
    text: hits
      .map((h) => `${byId.get(h.book_id) ?? '?'} ${h.chapter}:${h.verse} — ${h.text}`)
      .join('\n'),
  };
}
