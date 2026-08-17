-- prayer_day_full(date, rite, translation) — prayer_day() plus resolved
-- scripture text per reading.
--
-- Phase 1 (docs/superpowers/plans/2026-08-04-prayer-phase1.md), Task 3's
-- second RPC. Composes prayer_day()'s calendar+citation shape with
-- prayer_reading_text() (20260806120000), fed by the parsed_citation column
-- added in 20260817120000. This is the single call Task 4's usccb-readings
-- rewrite uses, so the deployed reading sheet needs no outbound HTTP request.
--
-- SECURITY INVOKER: every table this touches (gw_prayer_calendar_days,
-- gw_prayer_readings, gw_bible_*) is readable by all authenticated users,
-- so no elevation is needed and RLS still applies.

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
                           'verses',       COALESCE(rt.resolved->'verses', '[]'::jsonb),
                           'attribution',  rt.resolved->>'attribution'
                         )
                         ORDER BY r.schema_label, r.sort_order
                       )
                FROM public.gw_prayer_readings r
                -- A citation that never parsed (null usfmCode / empty ranges)
                -- degrades to an empty verses array via prayer_reading_text's
                -- own graceful handling — never an error, never a NULL.
                LEFT JOIN LATERAL (
                  SELECT public.prayer_reading_text(
                           p_translation,
                           r.parsed_citation->>'usfmCode',
                           r.parsed_citation->'ranges'
                         ) AS resolved
                ) rt ON true
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
