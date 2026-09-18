-- prayer_day_full(date, rite, translation) — prayer_day() plus verse text.
--
-- Composes prayer_day()'s calendar/citation shape with prayer_reading_text()
-- (20260806120000_prayer_reading_text.sql) using the usfm_code/ranges columns
-- added in 20260918120000_prayer_reading_ranges.sql. No citation parsing
-- happens here or in any caller — ranges are pre-computed at import time, so
-- this is a plain join.
--
-- This is the RPC supabase/functions/usccb-readings now calls instead of
-- scraping universalis.com.
--
-- SECURITY INVOKER: every table involved (gw_prayer_calendar_days,
-- gw_prayer_readings, gw_bible_*) is readable by all authenticated users, so
-- no elevation is needed and RLS still applies.

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
    'events', COALESCE(
      (
        SELECT jsonb_agg(e ORDER BY e->>'rank_grade' DESC NULLS LAST, e->>'event_key')
        FROM (
          SELECT jsonb_build_object(
            'event_key',         d.event_key,
            'name',              d.name,
            'rank_grade',        d.rank_grade,
            'rank_label',        d.rank_label,
            'color',             d.color,
            'liturgical_season', d.liturgical_season,
            'sunday_cycle',      d.sunday_cycle,
            'psalter_week',      d.psalter_week,
            'is_holy_day_of_obligation', d.is_holy_day_of_obligation,
            'readings', COALESCE(
              (
                SELECT jsonb_agg(
                         jsonb_build_object(
                           'slot',         r.slot,
                           'citation',     r.citation,
                           'schema_label', r.schema_label,
                           -- '[]' / NULL when usfm_code/ranges never resolved
                           -- (a "note" row, or a letter-chapter reference)
                           -- rather than erroring — the citation string alone
                           -- is still shown by every consumer.
                           'verses',       COALESCE(t.resolved->'verses', '[]'::jsonb),
                           'attribution',  t.resolved->>'attribution'
                         )
                         ORDER BY r.schema_label, r.sort_order
                       )
                FROM public.gw_prayer_readings r
                LEFT JOIN LATERAL (
                  SELECT public.prayer_reading_text(p_translation, r.usfm_code, r.ranges) AS resolved
                  WHERE r.usfm_code IS NOT NULL AND jsonb_array_length(r.ranges) > 0
                ) t ON true
                WHERE r.calendar_day_id = d.id
              ),
              '[]'::jsonb
            )
          ) AS e
          FROM public.gw_prayer_calendar_days d
          WHERE d.day_date = p_date
            AND d.rite = p_rite
        ) AS events
      ),
      '[]'::jsonb
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.prayer_day_full(date, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
