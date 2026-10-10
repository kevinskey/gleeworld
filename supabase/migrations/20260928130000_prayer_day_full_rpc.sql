-- prayer_day_full(date, rite, translation) — prayer_day() plus verse text.
--
-- Phase 1 (docs/superpowers/plans/2026-08-04-prayer-phase1.md), Task 3's
-- second RPC. Composes prayer_day()'s calendar/citation shape with
-- prayer_reading_text()'s verse lookup, using the usfm_code/ranges that
-- 20260928120000_prayer_readings_parsed_refs.sql added — already resolved
-- from the citation string by src/lib/prayer/citation.ts at import time, so
-- this function does no string parsing of its own.
--
-- A reading with no usfm_code or an empty ranges array (unresolvable
-- citation, or a row imported before the backfill) yields an empty 'verses'
-- array rather than an error — same "degrade, don't fail" behaviour as
-- prayer_reading_text() itself.
--
-- SECURITY INVOKER: gw_prayer_readings and gw_bible_* are both readable by
-- every authenticated user, so no elevation is needed and RLS still applies.

CREATE OR REPLACE FUNCTION public.prayer_day_full(
  p_date        date,
  p_rite        text DEFAULT 'roman_catholic',
  p_translation text DEFAULT 'WEBCE'
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'date', p_date,
    'rite', p_rite,
    'translation', p_translation,
    'attribution', (
      SELECT attribution FROM public.gw_bible_translations WHERE code = p_translation
    ),
    'events', COALESCE(
      (
        SELECT jsonb_agg(
                 jsonb_build_object(
                   'event_key',                 d.event_key,
                   'name',                      d.name,
                   'rank_grade',                d.rank_grade,
                   'rank_label',                d.rank_label,
                   'color',                     d.color,
                   'liturgical_season',         d.liturgical_season,
                   'sunday_cycle',              d.sunday_cycle,
                   'weekday_cycle',             d.weekday_cycle,
                   'psalter_week',              d.psalter_week,
                   'is_holy_day_of_obligation', d.is_holy_day_of_obligation,
                   'readings', COALESCE(
                     (
                       SELECT jsonb_agg(
                                jsonb_build_object(
                                  'slot',         r.slot,
                                  'citation',     r.citation,
                                  'schema_label', r.schema_label,
                                  'source',       r.source,
                                  'verses',       COALESCE(t.body->'verses', '[]'::jsonb)
                                )
                                ORDER BY r.schema_label, r.sort_order
                              )
                       FROM public.gw_prayer_readings r
                       LEFT JOIN LATERAL (
                         SELECT public.prayer_reading_text(p_translation, r.usfm_code, r.ranges) AS body
                         WHERE r.usfm_code IS NOT NULL AND jsonb_array_length(r.ranges) > 0
                       ) t ON true
                       WHERE r.calendar_day_id = d.id
                     ),
                     '[]'::jsonb
                   )
                 )
                 ORDER BY d.rank_grade DESC NULLS LAST, d.event_key
               )
        FROM public.gw_prayer_calendar_days d
        WHERE d.day_date = p_date
          AND d.rite = p_rite
      ),
      '[]'::jsonb
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.prayer_day_full(date, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
