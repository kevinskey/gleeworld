-- Prayer module — resolve a citation's verse ranges to actual scripture text.
--
-- Phase 1 (docs/superpowers/plans/2026-08-04-prayer-phase1.md), Task 3.
-- Citation parsing (a string like "Acts 7:51—8:1a" -> VerseRange[]) lives in
-- exactly one place: src/lib/prayer/citation.ts. This RPC does not parse
-- citations — it only resolves already-parsed ranges against gw_bible_verses,
-- so that logic is never duplicated in SQL.
--
-- SECURITY INVOKER: gw_bible_* is readable by every authenticated user (see
-- 20260804130000_prayer_bible.sql), so no elevation is needed and RLS still
-- applies.

CREATE OR REPLACE FUNCTION public.prayer_reading_text(
  p_translation text,
  p_usfm        text,
  p_ranges      jsonb
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH ranges AS (
    SELECT *
    FROM jsonb_to_recordset(COALESCE(p_ranges, '[]'::jsonb)) AS r(
      "startChapter" int,
      "startVerse"   int,
      "endChapter"   int,
      "endVerse"     int,
      "chapterLabel" text
    )
    -- Letter-labelled chapters (e.g. Esther's Greek additions, chapterLabel
    -- 'C') have no numeric chapter in gw_bible_verses and cannot be resolved
    -- here. They are dropped rather than erroring, same as an unparsed
    -- segment upstream in citation.ts.
    WHERE "startChapter" IS NOT NULL AND "endChapter" IS NOT NULL
  ),
  t AS (
    SELECT id, attribution
    FROM public.gw_bible_translations
    WHERE code = p_translation
  ),
  b AS (
    SELECT bk.id
    FROM public.gw_bible_books bk
    JOIN t ON bk.translation_id = t.id
    WHERE bk.usfm_code = p_usfm
  )
  SELECT jsonb_build_object(
    'translation', p_translation,
    'attribution', (SELECT attribution FROM t),
    'verses', COALESCE(
      (
        SELECT jsonb_agg(
                 jsonb_build_object('chapter', v.chapter, 'verse', v.verse, 'text', v.text)
                 ORDER BY v.chapter, v.verse
               )
        FROM public.gw_bible_verses v
        JOIN b ON v.book_id = b.id
        WHERE EXISTS (
          SELECT 1 FROM ranges r
          WHERE (v.chapter, v.verse) BETWEEN (r."startChapter", r."startVerse")
                                          AND (r."endChapter", r."endVerse")
        )
      ),
      '[]'::jsonb
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.prayer_reading_text(text, text, jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
