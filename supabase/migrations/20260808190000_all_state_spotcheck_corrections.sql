-- Corrections from the 2026-08-08 spot-check of published date claims.
--
-- 48 unique date claims across 10 states were re-fetched from the exact source
-- URLs we cite, and every weekday named on a source page was cross-checked
-- against the real 2026/27 calendar (which is how a timezone off-by-one would
-- surface). 47 confirmed. One did not.
--
-- ─────────────────────────────────────────────────────────────────────────
-- 1. OKLAHOMA — wrong event, wrong organisation, six days out.
--
-- Our program is "All-State Mixed Chorus and Treble Chorus", which is OkMEA's
-- ensemble; it performs at the OkMEA Winter Conference. But the event date was
-- scraped from oklacda.org — the Oklahoma Choral Directors Association, a
-- DIFFERENT body running a DIFFERENT event (the January All-State Festival:
-- JH Mixed/Treble, Show Choir, Vocal Jazz).
--
-- Published:  2027-01-14 to 2027-01-16, sourced from oklacda.org
-- Correct:    2027-01-20 to 2027-01-23, per okmea.org's own conference page
--             ("OkMEA 2027 Winter Conference / January 20-23, 2027"),
--             re-verified directly 2026-08-08.
--
-- A director whose student made the OkMEA chorus and booked travel for
-- Jan 14-16 would have missed the event by most of a week. This is the failure
-- mode the whole provenance model exists to prevent, and it slipped through
-- because the scraping agent found a plausible date on a plausible page
-- without checking that the ORGANISATION matched the program.
--
-- Lesson worth carrying into Phase 4: a source URL whose domain differs from
-- the program's own organisation deserves scrutiny, not acceptance.
-- ─────────────────────────────────────────────────────────────────────────

BEGIN;

UPDATE public.gw_all_state_dates d
   SET title      = 'OkMEA Winter Conference — All-State performance',
       start_at   = (TIMESTAMP '2027-01-20 00:00:00' AT TIME ZONE 'America/Chicago'),
       end_at     = (TIMESTAMP '2027-01-23 00:00:00' AT TIME ZONE 'America/Chicago'),
       source_url = 'https://okmea.org/conferences/january-conference/',
       source_id  = (SELECT id FROM public.gw_all_state_sources
                      WHERE url = 'https://okmea.org/conferences/january-conference/' LIMIT 1),
       retrieved_at = TIMESTAMPTZ '2026-08-08 00:00:00-05',
       description = 'The OkMEA All-State Mixed and Treble Choruses perform at the OkMEA Winter Conference. Note this is a different event from the Oklahoma Choral Directors Association''s January All-State Festival, which hosts the junior high, show choir and vocal jazz ensembles on different dates — check which body runs your student''s ensemble.',
       updated_at = now()
  FROM public.gw_all_state_programs p, public.gw_all_state_states s
 WHERE d.program_id = p.id AND p.state_id = s.id
   AND s.slug = 'oklahoma'
   AND d.title = 'January Festival / OkMEA Conference';

-- Register the corrected source so the provenance link resolves.
INSERT INTO public.gw_all_state_sources
  (state_id, organization_id, name, domain, url, source_type, trust_level, retrieved_at)
SELECT s.id, o.id, 'OkMEA January/Winter Conference', 'okmea.org',
       'https://okmea.org/conferences/january-conference/', 'calendar', 'official',
       TIMESTAMPTZ '2026-08-08 00:00:00-05'
  FROM public.gw_all_state_states s
  LEFT JOIN public.gw_all_state_organizations o ON o.state_id = s.id
 WHERE s.slug = 'oklahoma'
   AND NOT EXISTS (SELECT 1 FROM public.gw_all_state_sources x
                    WHERE x.url = 'https://okmea.org/conferences/january-conference/')
 LIMIT 1;

UPDATE public.gw_all_state_dates d
   SET source_id = (SELECT id FROM public.gw_all_state_sources
                     WHERE url = 'https://okmea.org/conferences/january-conference/' LIMIT 1)
  FROM public.gw_all_state_programs p, public.gw_all_state_states s
 WHERE d.program_id = p.id AND p.state_id = s.id AND s.slug = 'oklahoma'
   AND d.source_url = 'https://okmea.org/conferences/january-conference/';

-- ─────────────────────────────────────────────────────────────────────────
-- 2. KANSAS — title broader than its source.
--
-- Stored as "KMEA All-State Choirs concert" on 2027-02-27, but KMEA scopes
-- that date to the HIGH SCHOOL Mixed and Treble choirs. Middle level is
-- Feb 26 and elementary Feb 25, both already stored correctly against their
-- own programs. The date was right; the title invited a director of a middle
-- school choir to read it as covering them.
-- ─────────────────────────────────────────────────────────────────────────
UPDATE public.gw_all_state_dates d
   SET title = 'High school All-State choirs concert',
       updated_at = now()
  FROM public.gw_all_state_programs p, public.gw_all_state_states s
 WHERE d.program_id = p.id AND p.state_id = s.id
   AND s.slug = 'kansas'
   AND d.title = 'KMEA All-State Choirs concert';

COMMIT;

\echo ''
\echo '=== Oklahoma dates after correction ==='
SELECT d.title, to_char(d.start_at AT TIME ZONE d.timezone,'YYYY-MM-DD') AS starts,
       to_char(d.end_at AT TIME ZONE d.timezone,'YYYY-MM-DD') AS ends, d.source_url
  FROM gw_all_state_dates d
  JOIN gw_all_state_programs p ON p.id=d.program_id
  JOIN gw_all_state_states s ON s.id=p.state_id
 WHERE s.slug='oklahoma' ORDER BY d.start_at;

\echo ''
\echo '=== Kansas concert titles ==='
SELECT p.name, d.title, to_char(d.start_at AT TIME ZONE d.timezone,'YYYY-MM-DD') AS date
  FROM gw_all_state_dates d
  JOIN gw_all_state_programs p ON p.id=d.program_id
  JOIN gw_all_state_states s ON s.id=p.state_id
 WHERE s.slug='kansas' AND d.title ILIKE '%concert%' ORDER BY d.start_at;

NOTIFY pgrst, 'reload schema';
