-- Org-attribution corrections from the cross-organisation source audit.
--
-- After Oklahoma (a date scraped from the wrong body's site), every date whose
-- source domain differed from its program's organisation domain was verified
-- against the sites themselves. Six of eight flags were benign — registration
-- portals, affiliate sites, a festival's own subdomain. Two were real, and
-- both are the SAME bug in mirror image: the date was right, but the PROGRAM
-- was attributed to the wrong organisation.
--
-- 1. INDIANA. "Circle the State with Song" (elementary + MS/JH honor choirs)
--    is IMEA's program — circlethestate.imeamusic.org is an IMEA subdomain
--    with IMEA's own About page. We attributed all five Indiana programs to
--    the Indiana Choral Directors Association because ICDA runs the OTHER
--    three (HS Honor, Jazz, Show). Also: 2027 performance dates ARE now
--    published, per-area (Feb 13 for some areas, Feb 27 for others).
--
-- 2. SOUTH DAKOTA. The Elementary Honor Choir is SDMEA's program (sdmea.net
--    lists it among its own), while the HS All-State Chorus genuinely is
--    SDHSAA's. We attributed both to SDHSAA.
--
-- Colorado's flag needed no fix: the Feb 18-19 CMASC dates were already
-- attached to the Middle School program, distinct from the HS Feb 11-13.

BEGIN;

-- ── Indiana: IMEA organisation + reattribution of the two CTS programs ──
INSERT INTO public.gw_all_state_organizations (state_id, name, acronym, website_url, description)
SELECT s.id, 'Indiana Music Educators Association', 'IMEA', 'https://imeamusic.org/',
       'Runs the Circle the State with Song elementary and middle school honor choirs. The high school Honor Choir, Jazz Choir and Show Choir are run by the Indiana Choral Directors Association.'
  FROM public.gw_all_state_states s WHERE s.slug='indiana'
ON CONFLICT (state_id, name) DO NOTHING;

UPDATE public.gw_all_state_programs p
   SET organization_id = (SELECT o.id FROM public.gw_all_state_organizations o
                           JOIN public.gw_all_state_states s ON s.id=o.state_id
                          WHERE s.slug='indiana' AND o.acronym='IMEA'),
       updated_at = now()
 WHERE p.id IN (SELECT p2.id FROM public.gw_all_state_programs p2
                  JOIN public.gw_all_state_states s ON s.id=p2.state_id
                 WHERE s.slug='indiana' AND p2.name ILIKE '%IMEA%');

-- Per-area 2027 performance dates for the two IMEA programs. Published as two
-- festival days split by area; both stored, each saying which areas it covers,
-- because a single date would be wrong for half the state.
INSERT INTO public.gw_all_state_dates
  (program_id, date_type, title, start_at, all_day, timezone, description,
   source_url, retrieved_at, confidence, sort_order)
SELECT p.id, 'event', v.title,
       (v.d::timestamp AT TIME ZONE 'America/Indiana/Indianapolis'), true,
       'America/Indiana/Indianapolis', v.descr,
       'https://circlethestate.imeamusic.org/', TIMESTAMPTZ '2026-08-08 00:00:00-04',
       'official_source', v.ord
  FROM public.gw_all_state_programs p
  JOIN public.gw_all_state_states s ON s.id=p.state_id
  CROSS JOIN (VALUES
    ('Circle the State with Song festival (first area group)', '2027-02-13',
     'Festival date varies by IMEA area; February 13 serves one group of areas. Check which area your school belongs to on the Circle the State site.', 60),
    ('Circle the State with Song festival (second area group)', '2027-02-27',
     'Festival date varies by IMEA area; February 27 serves the remaining areas. Check which area your school belongs to on the Circle the State site.', 61)
  ) AS v(title, d, descr, ord)
 WHERE s.slug='indiana' AND p.name ILIKE '%IMEA%'
   AND NOT EXISTS (SELECT 1 FROM public.gw_all_state_dates x
                    WHERE x.program_id=p.id AND x.title=v.title);

-- ── South Dakota: SDMEA organisation + reattribution of the Elementary HC ──
INSERT INTO public.gw_all_state_organizations (state_id, name, acronym, website_url, description)
SELECT s.id, 'South Dakota Music Educators Association', 'SDMEA', 'https://sdmea.net/',
       'Runs the Elementary Honor Choir and middle school honor ensembles. The high school All-State Chorus is run by the South Dakota High School Activities Association.'
  FROM public.gw_all_state_states s WHERE s.slug='south-dakota'
ON CONFLICT (state_id, name) DO NOTHING;

UPDATE public.gw_all_state_programs p
   SET organization_id = (SELECT o.id FROM public.gw_all_state_organizations o
                           JOIN public.gw_all_state_states s ON s.id=o.state_id
                          WHERE s.slug='south-dakota' AND o.acronym='SDMEA'),
       updated_at = now()
 WHERE p.id IN (SELECT p2.id FROM public.gw_all_state_programs p2
                  JOIN public.gw_all_state_states s ON s.id=p2.state_id
                 WHERE s.slug='south-dakota' AND p2.name ILIKE '%Elementary%');

COMMIT;

\echo ''
\echo '=== corrected attributions ==='
SELECT s.slug, p.name, o.acronym AS org
  FROM gw_all_state_programs p
  JOIN gw_all_state_states s ON s.id=p.state_id
  LEFT JOIN gw_all_state_organizations o ON o.id=p.organization_id
 WHERE s.slug IN ('indiana','south-dakota') ORDER BY s.slug, p.name;

NOTIFY pgrst, 'reload schema';
