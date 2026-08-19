-- prayer_day(date, rite) — "what is today, and what is read?"
--
-- Returns every celebration on the date (a date routinely carries a feria plus
-- an optional memorial, and Christmas carries several formularies) with its
-- reading citations in liturgical order.
--
-- SECURITY INVOKER: the reference tables are readable by every authenticated
-- user, so no elevation is needed and RLS still applies.
--
-- Ordering notes, both pinned by tests:
--   * events sort by rank_grade as an INTEGER. Sorting the jsonb text would
--     put 10 before 6.
--   * readings sort by schema_label then sort_order, so the default formulary
--     comes before Christmas night/dawn/day.

CREATE OR REPLACE FUNCTION public.prayer_day(
  p_date date,
  p_rite text DEFAULT 'roman_catholic'
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
                                  'source',       r.source
                                )
                                ORDER BY r.schema_label, r.sort_order
                              )
                       FROM public.gw_prayer_readings r
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

GRANT EXECUTE ON FUNCTION public.prayer_day(date, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
