-- Strip USCCB page boilerplate from stored weekly readings.
--
-- The readings scraper captured the page's trailing chrome along with the
-- gospel text: podcast/Spanish/calendar/e-mail links and the Lectionary
-- copyright notice. It sits at the END of the gospel column on 103 of 159
-- rows (plus stray LISTEN PODCAST on 2), so the Liturgy Planner shows a
-- wall of navigation links after every Sunday gospel.
--
-- The cleaner truncates at the EARLIEST boilerplate marker and keeps what
-- precedes it, so scripture text is never touched — the markers are strings
-- that cannot occur inside a reading. Applied to every text column for
-- thoroughness, though today only gospel is affected.

BEGIN;

CREATE OR REPLACE FUNCTION public.usccb_strip_boilerplate(t text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  markers text[] := ARRAY[
    'LISTEN PODCAST',
    '- En Español',
    '- View Calendar',
    '- Get Daily Readings E-mails',
    'Lectionary for Mass for Use in the Dioceses'
  ];
  m text;
  pos int;
  cut int := 0;
BEGIN
  IF t IS NULL THEN RETURN NULL; END IF;
  FOREACH m IN ARRAY markers LOOP
    pos := position(m in t);
    IF pos > 0 AND (cut = 0 OR pos < cut) THEN cut := pos; END IF;
  END LOOP;
  IF cut = 0 THEN RETURN t; END IF;
  -- Keep everything before the first marker; drop trailing blank lines.
  RETURN regexp_replace(left(t, cut - 1), '[\s\-]+$', '');
END;
$$;

UPDATE public.usccb_readings SET
  first_reading      = public.usccb_strip_boilerplate(first_reading),
  responsorial_psalm = public.usccb_strip_boilerplate(responsorial_psalm),
  psalm_text         = public.usccb_strip_boilerplate(psalm_text),
  second_reading     = public.usccb_strip_boilerplate(second_reading),
  gospel_acclamation = public.usccb_strip_boilerplate(gospel_acclamation),
  gospel             = public.usccb_strip_boilerplate(gospel),
  full_content       = public.usccb_strip_boilerplate(full_content),
  updated_at         = now()
WHERE first_reading      ILIKE '%En Español%' OR first_reading      ILIKE '%LISTEN PODCAST%' OR first_reading      ILIKE '%Lectionary for Mass%'
   OR responsorial_psalm ILIKE '%En Español%' OR responsorial_psalm ILIKE '%LISTEN PODCAST%' OR responsorial_psalm ILIKE '%Lectionary for Mass%'
   OR psalm_text         ILIKE '%En Español%' OR psalm_text         ILIKE '%LISTEN PODCAST%' OR psalm_text         ILIKE '%Lectionary for Mass%'
   OR second_reading     ILIKE '%En Español%' OR second_reading     ILIKE '%LISTEN PODCAST%' OR second_reading     ILIKE '%Lectionary for Mass%'
   OR gospel_acclamation ILIKE '%En Español%' OR gospel_acclamation ILIKE '%LISTEN PODCAST%' OR gospel_acclamation ILIKE '%Lectionary for Mass%'
   OR gospel             ILIKE '%En Español%' OR gospel             ILIKE '%LISTEN PODCAST%' OR gospel             ILIKE '%Lectionary for Mass%'
   OR full_content       ILIKE '%En Español%' OR full_content       ILIKE '%LISTEN PODCAST%' OR full_content       ILIKE '%Lectionary for Mass%';

COMMIT;

\echo '=== after cleanup: rows still carrying boilerplate (want 0) ==='
SELECT count(*) FROM public.usccb_readings
 WHERE gospel ILIKE '%En Español%' OR gospel ILIKE '%LISTEN PODCAST%'
    OR gospel ILIKE '%Lectionary for Mass%' OR gospel ILIKE '%View Calendar%'
    OR first_reading ILIKE '%LISTEN PODCAST%' OR second_reading ILIKE '%LISTEN PODCAST%';

\echo '=== spot check: tail of a previously-affected gospel ==='
SELECT right(gospel, 160) FROM public.usccb_readings
 WHERE liturgical_day = 'Fourth Sunday of Lent' LIMIT 1;

NOTIFY pgrst, 'reload schema';
