-- Corrections from the full-coverage verification pass (2026-08-08).
--
-- 209 further date claims re-fetched from their cited sources across the 37
-- previously-unverified states. ZERO hard dates were wrong — every specific
-- day matched its source, and every weekday named on a page checks against the
-- real calendar. (Two source pages contain their own weekday typos — Montana
-- calls Fri May 1 2026 "Thursday", Nevada calls Fri Nov 14 2025 "Monday" —
-- our dates are correct in both.)
--
-- What DID need fixing is subtler than wrong dates, and worth naming as a
-- class: claims whose CITATION does not actually support them. A fact with a
-- source link a reviewer can't find on the page is corrosive in a different
-- way than a wrong fact — it teaches people to stop checking.

BEGIN;

-- ── 1. SOUTH DAKOTA: "Final roster notification 2026-10-31" — fabricated.
--    The page attaches no date to roster notification (rosters were emailed
--    before the event); Oct 31 is the concert day. Delete rather than fix:
--    there is nothing published to anchor it to.
DELETE FROM public.gw_all_state_dates d
 USING public.gw_all_state_programs p, public.gw_all_state_states s
 WHERE d.program_id=p.id AND p.state_id=s.id
   AND s.slug='south-dakota' AND d.title='Final roster notification';

-- ── 2. SOUTH CAROLINA: concert date was an inference. SCMEA publishes the
--    All-State Weekend (Feb 25-27) but no concert day or time. Feb 27 is a
--    plausible reading of "final day", not a published fact. Convert to an
--    honest undated entry rather than delete — a family SHOULD know a public
--    concert happens that weekend.
UPDATE public.gw_all_state_dates d
   SET start_at=NULL, end_at=NULL,
       description='Held during All-State Weekend (February 25-27, 2027, Winthrop University). SCMEA has not published the concert day or time.',
       updated_at=now()
  FROM public.gw_all_state_programs p, public.gw_all_state_states s
 WHERE d.program_id=p.id AND p.state_id=s.id
   AND s.slug='south-carolina' AND d.title ILIKE '%concert%';

-- ── 3. INDIANA CSWS: dates right, citation wrong. The homepage's Deadlines/
--    Performances sections are empty headings; the per-area 2027 dates live on
--    the Site Performance Dates & Locations subpage.
UPDATE public.gw_all_state_dates d
   SET source_url='https://circlethestate.imeamusic.org/site-performance-dates-locations',
       updated_at=now()
  FROM public.gw_all_state_programs p, public.gw_all_state_states s
 WHERE d.program_id=p.id AND p.state_id=s.id
   AND s.slug='indiana' AND d.title ILIKE 'Circle the State%';

-- ── 4. MONTANA Gala Concert: date correct (Friday evening of the Oct 14-16
--    festival) but cited against a rules booklet that names no 2026 dates.
--    Repoint at the same MHSA source that states the festival dates, and say
--    how the day is derived.
UPDATE public.gw_all_state_dates d
   SET source_url=(SELECT d2.source_url FROM public.gw_all_state_dates d2
                    JOIN public.gw_all_state_programs p2 ON p2.id=d2.program_id
                    JOIN public.gw_all_state_states s2 ON s2.id=p2.state_id
                   WHERE s2.slug='montana' AND d2.title ILIKE '%Festival%'
                     AND d2.source_url IS NOT NULL LIMIT 1),
       description='The Gala Concert is the Friday evening of the festival (October 14-16, 2026). MHSA publishes the festival dates; the concert evening comes from its standing "Friday evening" rule.',
       updated_at=now()
  FROM public.gw_all_state_programs p, public.gw_all_state_states s
 WHERE d.program_id=p.id AND p.state_id=s.id
   AND s.slug='montana' AND d.title ILIKE '%Gala%';

-- ── 5. NEW JERSEY: njmea.org lists TWO "Mixed Chorus and Orchestra" concerts
--    — Fri Nov 6 2026 (Atlantic City) and Sun Nov 15 2026 (Newark). We had
--    only Nov 6; a family reading one entry could drive to the wrong city.
UPDATE public.gw_all_state_dates d
   SET title='All-State Mixed Chorus and Orchestra concert — Atlantic City',
       updated_at=now()
  FROM public.gw_all_state_programs p, public.gw_all_state_states s
 WHERE d.program_id=p.id AND p.state_id=s.id
   AND s.slug='new-jersey' AND d.title ILIKE '%Mixed Chorus and Orchestra Concert%';

INSERT INTO public.gw_all_state_dates
  (program_id, date_type, title, start_at, all_day, timezone, description,
   source_url, retrieved_at, confidence, sort_order)
SELECT p.id, 'event', 'All-State Mixed Chorus and Orchestra concert — Newark',
       (TIMESTAMP '2026-11-15 00:00:00' AT TIME ZONE 'America/New_York'), true,
       'America/New_York',
       'Second performance of the same program, at NJPAC in Newark. Check which concert your student performs in.',
       (SELECT d2.source_url FROM public.gw_all_state_dates d2
         WHERE d2.program_id=p.id AND d2.title ILIKE '%Atlantic City%' LIMIT 1),
       TIMESTAMPTZ '2026-08-08 00:00:00-04', 'official_source', 55
  FROM public.gw_all_state_programs p
  JOIN public.gw_all_state_states s ON s.id=p.state_id
 WHERE s.slug='new-jersey' AND p.name ILIKE '%Mixed%'
   AND NOT EXISTS (SELECT 1 FROM public.gw_all_state_dates x
                    WHERE x.program_id=p.id AND x.title ILIKE '%Newark%');

-- ── 6. Month-level updates found on freshly-changed pages: record them as
--    descriptions on the existing undated rows (a month is not a start_at).
UPDATE public.gw_all_state_dates d
   SET description='VCDA publishes "February" only — the day and format are set by each district. Check your district.',
       retrieved_at=TIMESTAMPTZ '2026-08-08 00:00:00-05', updated_at=now()
  FROM public.gw_all_state_programs p, public.gw_all_state_states s
 WHERE d.program_id=p.id AND p.state_id=s.id
   AND s.slug='virginia' AND d.title ILIKE '%auditions%' AND d.start_at IS NULL;

UPDATE public.gw_all_state_dates d
   SET description='WVMEA has announced "March 2027", with details promised in Fall 2026.',
       retrieved_at=TIMESTAMPTZ '2026-08-08 00:00:00-05', updated_at=now()
  FROM public.gw_all_state_programs p, public.gw_all_state_states s
 WHERE d.program_id=p.id AND p.state_id=s.id
   AND s.slug='west-virginia' AND d.title ILIKE '%In-Service Conference%' AND d.start_at IS NULL;

COMMIT;
NOTIFY pgrst, 'reload schema';
