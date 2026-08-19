-- Texas All-State Choir, 2026-27 season (the "2027 All-State") — TMEA.
--
-- Every fact retrieved from tmea.org on 2026-08-07 with its source URL.
-- Nothing inferred; absent where TMEA has not published. See the NOT PUBLISHED
-- block at the bottom.
--
-- WHY TEXAS IS THE REAL TEST OF THE SCHEMA. Georgia was deliberately simple:
-- one organization, three grade brackets, two audition rounds, titles-only
-- repertoire. Texas is the opposite on every axis —
--   • FOUR ensembles across TWO classification tracks (5A-6A open to all,
--     1A-4A restricted to small schools), not grade brackets
--   • THREE-to-FOUR rounds (District → Region → Pre-Area → Area) versus two
--   • DIFFERENT voice parts per track: eight for 5A-6A, four for 1A-4A
--   • a fully published repertoire list with composer, publisher, catalog
--     number, voicing, and a per-piece "audition level"
--   • real, published fee amounts, where GMEA publishes none
-- All of it lands in the existing Layer 1 tables with ZERO schema changes,
-- which is the claim Phase 1 was making. One honest squeeze: TMEA's per-piece
-- "audition level" (usable any round vs designated for Area) has no dedicated
-- column, so it goes in repertoire.notes. If a third state also publishes a
-- per-piece round restriction, that earns its own column.

BEGIN;

INSERT INTO public.gw_all_state_organizations (state_id, name, acronym, website_url, description)
SELECT s.id, 'Texas Music Educators Association', 'TMEA', 'https://www.tmea.org/',
       'Founded 1920, based in Austin. Over 20,000 members across 33 geographic Regions and five divisions (Band, Orchestra, Vocal, Elementary, College). Runs 18 Texas All-State ensembles, four of them choirs, seating 1,810 students from roughly 70,000 annual auditions.'
  FROM public.gw_all_state_states s WHERE s.slug = 'texas'
ON CONFLICT (state_id, name) DO NOTHING;

INSERT INTO public.gw_all_state_sources
  (state_id, organization_id, name, domain, url, source_type, trust_level, retrieved_at)
SELECT s.id, o.id, v.name, 'tmea.org', v.url, v.stype, 'official', TIMESTAMPTZ '2026-08-07 00:00:00-05'
  FROM public.gw_all_state_states s
  JOIN public.gw_all_state_organizations o ON o.state_id = s.id AND o.acronym = 'TMEA'
  CROSS JOIN (VALUES
    ('TMEA Vocal Division — 2026-27 All-State Audition Material',
     'https://www.tmea.org/vocal/audition-material/', 'official'),
    ('TMEA Vocal — Area Auditions (dates, sites, chairs)',
     'https://www.tmea.org/vocal/all-state/area/', 'calendar'),
    ('TMEA Vocal — 1A-4A / small school track',
     'https://www.tmea.org/vocal/all-state/small-school/', 'official'),
    ('TMEA Eligibility Requirements (revised March 2026 for 2026-27)',
     'https://www.tmea.org/all-state/eligibility/', 'official'),
    ('TMEA All-State Instrumentation & Voicing (revised April 2026)',
     'https://www.tmea.org/all-state/instrumentation-voicing/', 'official'),
    ('TMEA Clinic/Convention — All-State performances',
     'https://www.tmea.org/convention/performances/all-state/', 'calendar'),
    ('TMEA Membership & dues',
     'https://www.tmea.org/membership/', 'official')
  ) AS v(name, url, stype)
 WHERE s.slug = 'texas'
   AND NOT EXISTS (SELECT 1 FROM public.gw_all_state_sources x WHERE x.url = v.url);

-- ─────────────────────────────────────────────────────────────────────────
-- Four programs. Modelled on TMEA's own ensembles rather than grade brackets,
-- because that is the unit TMEA actually publishes, seats, and assigns
-- conductors and repertoire to.
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO public.gw_all_state_programs
  (state_id, organization_id, name, slug, season, lineage_key, school_level, ensemble_type,
   description, verification_status)
SELECT s.id, o.id, v.name, v.slug, '2026-27', v.lineage, 'high', v.etype, v.descr, 'pending_verification'
  FROM public.gw_all_state_states s
  JOIN public.gw_all_state_organizations o ON o.state_id = s.id AND o.acronym = 'TMEA'
  CROSS JOIN (VALUES
    ('All-State 5A-6A Mixed Choir', 'texas-as-5a6a-mixed-2026-27', 'texas-as-5a6a-mixed', 'mixed chorus',
     'Open to students from any UIL classification. Part of the 504-seat 5A-6A track. Three or four audition rounds: Region, Pre-Area, Area (some Regions add a District round).'),
    ('All-State Treble Choir', 'texas-as-treble-2026-27', 'texas-as-treble', 'treble chorus',
     'Part of the 504-seat 5A-6A track. Three or four audition rounds ending at the Area audition.'),
    ('All-State Tenor-Bass Choir', 'texas-as-tenor-bass-2026-27', 'texas-as-tenor-bass', 'tenor-bass chorus',
     'Part of the 504-seat 5A-6A track. Three or four audition rounds ending at the Area audition.'),
    ('All-State 1A-4A Mixed Choir', 'texas-as-1a4a-mixed-2026-27', 'texas-as-1a4a-mixed', 'mixed chorus',
     'Restricted to students from UIL 1A-4A schools. A 112-member choir, 28 per voice part. Two or three audition rounds: Region, Pre-Area, Area. Conducted across 13 Regions and 5 Areas.')
  ) AS v(name, slug, lineage, etype, descr)
 WHERE s.slug = 'texas'
ON CONFLICT (lineage_key, season) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────
-- Dates shared by all four programs. TMEA publishes the Area round and the
-- convention centrally; District/Region/Pre-Area dates are set by each of the
-- 33 Regions and are NOT centrally published, so they are absent rather than
-- invented. That gap is surfaced as a requirement instead.
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO public.gw_all_state_dates
  (program_id, date_type, title, start_at, end_at, all_day, timezone, description,
   source_id, source_url, retrieved_at, confidence, sort_order)
SELECT p.id, v.dtype, v.title, v.starts, v.ends, true, 'America/Chicago', v.descr,
       (SELECT s2.id FROM public.gw_all_state_sources s2 WHERE s2.url = v.surl LIMIT 1),
       v.surl, TIMESTAMPTZ '2026-08-07 00:00:00-05', 'official_source', v.ord
  FROM public.gw_all_state_programs p
  CROSS JOIN (VALUES
    ('other', 'Errata deadline — notify the Vocal VP',
     TIMESTAMPTZ '2026-08-30 00:00:00-05', NULL::timestamptz,
     'No errata are added after September 1. Errata are official only when published on the TMEA audition-material page.',
     'https://www.tmea.org/vocal/audition-material/', 10),
    ('registration_deadline', 'Area Declaration Form due',
     TIMESTAMPTZ '2026-12-14 00:00:00-06', NULL::timestamptz,
     'Eligibility Section III, Article 2. Students eligible for both tracks declare one; the track is fixed for the audition year.',
     'https://www.tmea.org/all-state/eligibility/', 20),
    ('audition_round', 'Area auditions (final round)',
     TIMESTAMPTZ '2027-01-09 00:00:00-06', NULL::timestamptz,
     'Held statewide on one day for both tracks. The Area audition selects the All-State choirs. Eight Areas (A-H) for 5A-6A; five (Central, East, North, South, West) for 1A-4A.',
     'https://www.tmea.org/vocal/all-state/area/', 40),
    ('event', 'TMEA Clinic/Convention',
     TIMESTAMPTZ '2027-02-10 00:00:00-06', TIMESTAMPTZ '2027-02-13 00:00:00-06',
     'San Antonio, Texas.',
     'https://www.tmea.org/convention/performances/all-state/', 50),
    ('event', 'All-State choir concerts',
     TIMESTAMPTZ '2027-02-13 00:00:00-06', NULL::timestamptz,
     'Henry B. Gonzalez Convention Center, 900 E. Market Street — Stars at Night Ballroom, 3rd floor. Clock times not yet published.',
     'https://www.tmea.org/convention/performances/all-state/', 60)
  ) AS v(dtype, title, starts, ends, descr, surl, ord)
 WHERE p.slug LIKE 'texas-as-%-2026-27'
   AND NOT EXISTS (SELECT 1 FROM public.gw_all_state_dates d
                    WHERE d.program_id = p.id AND d.title = v.title);

-- ─────────────────────────────────────────────────────────────────────────
-- Requirements shared across all four programs.
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO public.gw_all_state_requirements
  (program_id, category, title, description, structured_data,
   source_id, source_url, retrieved_at, confidence, sort_order)
SELECT p.id, v.cat, v.title, v.descr, v.sdata,
       (SELECT s2.id FROM public.gw_all_state_sources s2 WHERE s2.url = v.surl LIMIT 1),
       v.surl, TIMESTAMPTZ '2026-08-07 00:00:00-05', 'official_source', v.ord
  FROM public.gw_all_state_programs p
  CROSS JOIN (VALUES
    ('eligibility', 'Full-time Texas student, certified by a TMEA Active Member director',
     'The student must be enrolled full time in a Texas school for the semester(s) of both the audition and the concert, and be certified by their TMEA Active Member director as an actively participating member of the school choir program for the entire semester. Schools without a choir program use a TMEA Active Member sponsor designated by the chief administrator.',
     '{}'::jsonb, 'https://www.tmea.org/all-state/eligibility/', 10),
    ('membership', 'Director must hold current TMEA Active or Life membership',
     'Only Active or Life members may enter students. The director or sponsor must attend all TMEA auditions and related activities; Regions define proxy guidelines in writing. Active dues are $65/year, membership year July 1 to June 30.',
     '{"active_dues_usd": 65}'::jsonb, 'https://www.tmea.org/membership/', 20),
    ('eligibility', 'Track declaration — one track per audition year',
     'Students eligible for both tracks may advance past the Region level in only one. The track is declared when entering the first audition leading to All-State. Directors at 1A-4A schools choose the track student by student, not school-wide.',
     '{}'::jsonb, 'https://www.tmea.org/vocal/all-state/small-school/', 30),
    ('eligibility', 'Duplication rule across All-State groups',
     'A student may initially audition for multiple groups. If they qualify to Area in more than one, only one Area audition may be taken that fall. A student named to All-State Jazz, Orchestra or Mariachi cannot audition for other All-State groups; if not named, they may continue to the Band or Choir Area audition in January.',
     '{}'::jsonb, 'https://www.tmea.org/all-state/eligibility/', 40),
    ('format', 'District, Region and Pre-Area dates are set by each Region',
     'TMEA publishes the Area round centrally. The earlier rounds, their dates, and the Region entry fee are set by each of the 33 Regions and published in that Region''s own audition policies. Check your Region''s site.',
     '{"region_index": "https://www.tmea.org/regions/"}'::jsonb, 'https://www.tmea.org/vocal/all-state/small-school/', 50),
    ('materials', 'Audition cuts are reduced by each Region',
     'TMEA publishes the selections; the specific cuts are set regionally. The first day Regions may reduce audition cuts is August 1, 2026. Exact measure numbers are not published centrally.',
     '{}'::jsonb, 'https://www.tmea.org/vocal/audition-material/', 60),
    ('materials', 'Pieces must be auditioned before the final round',
     'All pieces designated for a track must be auditioned or performed prior to the January final round — except pieces marked "Designated for Area Audition use", which may be reserved for the final round.',
     '{}'::jsonb, 'https://www.tmea.org/vocal/audition-material/', 70),
    ('sight_reading', 'Sight-reading is part of the audition',
     'TMEA publishes sight-reading levels, judging tips and deduction criteria, plus starting-pitch prompt audio (Low So / Do / Mi / So across nine keys, with Treble and Tenor-Bass variants).',
     '{}'::jsonb, 'https://www.tmea.org/vocal/audition-material/', 80)
  ) AS v(cat, title, descr, sdata, surl, ord)
 WHERE p.slug LIKE 'texas-as-%-2026-27'
   AND NOT EXISTS (SELECT 1 FROM public.gw_all_state_requirements r
                    WHERE r.program_id = p.id AND r.title = v.title);

-- Divisi assignment differs by track — a per-program requirement.
INSERT INTO public.gw_all_state_requirements
  (program_id, category, title, description, structured_data,
   source_id, source_url, retrieved_at, confidence, sort_order)
SELECT p.id, 'materials', 'Divisi assignment for 2026-27', v.descr, v.sdata,
       (SELECT s2.id FROM public.gw_all_state_sources s2
         WHERE s2.url = 'https://www.tmea.org/vocal/audition-material/' LIMIT 1),
       'https://www.tmea.org/vocal/audition-material/',
       TIMESTAMPTZ '2026-08-07 00:00:00-05', 'official_source', 90
  FROM public.gw_all_state_programs p
  CROSS JOIN (VALUES
    ('5a6a', 'Areas A, B, C and D take the lower divisi pitches; Areas E, F, G and H take the upper.',
     '{"lower": ["A","B","C","D"], "upper": ["E","F","G","H"]}'::jsonb),
    ('1a4a', 'Areas North, South and West take the upper divisi pitches; Areas East and Central take the lower.',
     '{"upper": ["North","South","West"], "lower": ["East","Central"]}'::jsonb)
  ) AS v(track, descr, sdata)
 WHERE (v.track = '1a4a') = (p.slug = 'texas-as-1a4a-mixed-2026-27')
   AND p.slug LIKE 'texas-as-%-2026-27'
   AND NOT EXISTS (SELECT 1 FROM public.gw_all_state_requirements r
                    WHERE r.program_id = p.id AND r.title = 'Divisi assignment for 2026-27');

-- ─────────────────────────────────────────────────────────────────────────
-- Fees. TMEA publishes real amounts, unlike GMEA. Both are payable to the
-- state association, so GleeWorld only displays them — no checkout.
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO public.gw_all_state_fees
  (program_id, fee_type, amount_cents, currency, payable_to, description,
   source_id, source_url, retrieved_at, confidence)
SELECT p.id, v.ftype, v.cents, 'usd', 'state_association', v.descr,
       (SELECT s2.id FROM public.gw_all_state_sources s2 WHERE s2.url = v.surl LIMIT 1),
       v.surl, TIMESTAMPTZ '2026-08-07 00:00:00-05', 'official_source'
  FROM public.gw_all_state_programs p
  CROSS JOIN (VALUES
    ('area_audition', 700,
     'Charged per student for the Area audition, billed to each Region by TMEA headquarters.',
     'https://www.tmea.org/vocal/all-state/small-school/'),
    ('participation', 3000,
     'All-State membership/participation fee, paid online in the All-State Member Dashboard by students who are named to a choir.',
     'https://www.tmea.org/vocal/all-state/small-school/')
  ) AS v(ftype, cents, descr, surl)
 WHERE p.slug LIKE 'texas-as-%-2026-27'
   AND NOT EXISTS (SELECT 1 FROM public.gw_all_state_fees f
                    WHERE f.program_id = p.id AND f.fee_type = v.ftype);

-- ─────────────────────────────────────────────────────────────────────────
-- Voice parts differ by track: eight for 5A-6A, four for 1A-4A. This is
-- exactly why voice parts hang off the PROGRAM rather than the state.
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO public.gw_all_state_voice_parts (program_id, code, label, sort_order)
SELECT p.id, v.code, v.label, v.ord
  FROM public.gw_all_state_programs p
  CROSS JOIN (VALUES
    ('S1','Soprano 1',10), ('S2','Soprano 2',20), ('A1','Alto 1',30), ('A2','Alto 2',40),
    ('T1','Tenor 1',50),   ('T2','Tenor 2',60),   ('B1','Bass 1',70), ('B2','Bass 2',80)
  ) AS v(code, label, ord)
 WHERE p.slug IN ('texas-as-5a6a-mixed-2026-27','texas-as-treble-2026-27','texas-as-tenor-bass-2026-27')
ON CONFLICT (program_id, code) DO NOTHING;

INSERT INTO public.gw_all_state_voice_parts (program_id, code, label, sort_order)
SELECT p.id, v.code, v.label, v.ord
  FROM public.gw_all_state_programs p
  CROSS JOIN (VALUES
    ('S','Soprano',10), ('A','Alto',20), ('T','Tenor',30), ('B','Bass',40)
  ) AS v(code, label, ord)
 WHERE p.slug = 'texas-as-1a4a-mixed-2026-27'
ON CONFLICT (program_id, code) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────
-- Repertoire — the official 2026-27 audition selections. Full bibliographic
-- metadata, which TMEA publishes and GMEA does not.
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO public.gw_all_state_repertoire
  (program_id, title, composer, arranger, publisher, catalog_number, voicing,
   purpose, notes, source_url, sort_order)
SELECT p.id, v.title, v.composer, v.arranger, v.publisher, v.catalog, v.voicing,
       'audition', v.notes, 'https://www.tmea.org/vocal/audition-material/', v.ord
  FROM public.gw_all_state_programs p
  CROSS JOIN (VALUES
    -- 5A-6A Mixed Choir
    ('texas-as-5a6a-mixed-2026-27','Hold to God''s Unchanging Hand','James Hall','Jason D. Thompson','Hinshaw','00346300','SATB','Any audition prior to Area',10),
    ('texas-as-5a6a-mixed-2026-27','Water Fountain',NULL,'Kristopher Fulton','Mark Foster','888680961244','SATB divisi','Any audition prior to Area',20),
    ('texas-as-5a6a-mixed-2026-27','Hiob (Job Cantata), Movement 1','Fanny Mendelssohn Hensel',NULL,'Furore','Fue 5261','SATB','Any audition prior to Area',30),
    ('texas-as-5a6a-mixed-2026-27','Hiob (Job Cantata), Movement 3','Fanny Mendelssohn Hensel',NULL,'Furore','Fue 5261','SATB','Designated for Area audition; may also be used earlier',40),
    ('texas-as-5a6a-mixed-2026-27','Cedit, Hyems','Abbie Betinis',NULL,'Hal Leonard','HL 50486492','SATB','Designated for Area audition; may also be used earlier',50),
    ('texas-as-5a6a-mixed-2026-27','I Dream a World','Kyle Pederson',NULL,'ESC Publishing','1.3687','SATB divisi','Any audition prior to Area',60),
    -- Treble Choir
    ('texas-as-treble-2026-27','Moon Goddess','Jocelyn Hagen',NULL,'Graphite Publishing','JHC020','SSA','Designated for Area audition; may also be used earlier',10),
    ('texas-as-treble-2026-27','Lorelei','Clara Schumann','Brandon Williams','Hal Leonard','HL 00210352','SSA','Any audition prior to Area',20),
    ('texas-as-treble-2026-27','Freedom Train','Rollo Dilworth',NULL,'Hal Leonard','HL 00215490','SSA divisi','Any audition prior to Area',30),
    ('texas-as-treble-2026-27','Richer for Her','Andrea Ramsey',NULL,'Music Spoke',NULL,'SSA','Any audition prior to Area',40),
    -- Tenor-Bass Choir
    ('texas-as-tenor-bass-2026-27','Night, Veiled Night','Anthony Maglione',NULL,'Walton Music','GIP02765','TTBB double choir','Designated for Area audition; may also be used earlier',10),
    ('texas-as-tenor-bass-2026-27','Serenade italienne','Ernest Chausson','Mari Esabel Valverde','Walton Music','WLG170','TBB','Any audition prior to Area',20),
    ('texas-as-tenor-bass-2026-27','Plakatap','Sydney Guillaume',NULL,'Sydney Guillaume',NULL,'TBB','Any audition prior to Area',30),
    ('texas-as-tenor-bass-2026-27','Tuba','Michael Barrett',NULL,'Walton Music','WW1701','TTBB','Any audition prior to Area',40),
    -- 1A-4A Mixed Choir
    ('texas-as-1a4a-mixed-2026-27','Children Go Where I Send Thee',NULL,'Kevin Johnson','Carl Fischer','CM9743','SATB','Any audition prior to Area',10),
    ('texas-as-1a4a-mixed-2026-27','Ne Timeas Maria','Tomás Luis de Victoria',NULL,'Hal Leonard','HL 366857','SATB','Any audition prior to Area',20),
    ('texas-as-1a4a-mixed-2026-27','The Dark Hills','Jenni Brandon',NULL,'Jenni Brandon',NULL,'SATB','Any audition prior to Area',30),
    ('texas-as-1a4a-mixed-2026-27','Kyrie','W. A. Mozart',NULL,'CPDL','CPDL','SATB','Designated for Area audition; may also be used earlier. Free download via CPDL.',40),
    ('texas-as-1a4a-mixed-2026-27','The Ground','Ola Gjeilo',NULL,'Walton Music','WW1460','SATB divisi','Designated for Area audition; may also be used earlier',50),
    ('texas-as-1a4a-mixed-2026-27','Beat! Beat! Drums!','Ralph Vaughan Williams',NULL,'Oxford University Press','9780193866201','SATB','Designated for Area audition; may also be used earlier',60)
  ) AS v(slug, title, composer, arranger, publisher, catalog, voicing, notes, ord)
 WHERE p.slug = v.slug
   AND NOT EXISTS (SELECT 1 FROM public.gw_all_state_repertoire r
                    WHERE r.program_id = p.id AND r.title = v.title);

INSERT INTO public.gw_all_state_documents
  (program_id, title, document_type, url, retrieved_at, source_id, sort_order)
SELECT p.id, v.title, v.dtype, v.url, TIMESTAMPTZ '2026-08-07 00:00:00-05',
       (SELECT s2.id FROM public.gw_all_state_sources s2 WHERE s2.url = v.url LIMIT 1), v.ord
  FROM public.gw_all_state_programs p
  CROSS JOIN (VALUES
    ('2026-27 Vocal All-State Audition Material', 'rules', 'https://www.tmea.org/vocal/audition-material/', 10),
    ('Eligibility Requirements (revised March 2026)', 'rules', 'https://www.tmea.org/all-state/eligibility/', 20),
    ('Vocal Sightreading Levels (July 2025)', 'form', 'https://www.tmea.org/wp-content/uploads/Region_Admin/Sightreading/Vocal_Sightreading_Levels_2025.pdf', 30),
    ('Judging Tips and Sightreading Deductions (July 2024)', 'form', 'https://www.tmea.org/wp-content/uploads/Region_Admin/Vocal_Judging_Tips.pdf', 40),
    ('All-State Instrumentation and Voicing (April 2026)', 'rules', 'https://www.tmea.org/all-state/instrumentation-voicing/', 50),
    ('2026-2028 Region and Area Alignments', 'other', 'https://align.tmea.org/Align_2628/', 60),
    ('Region index — District/Region/Pre-Area dates and fees', 'calendar', 'https://www.tmea.org/regions/', 70)
  ) AS v(title, dtype, url, ord)
 WHERE p.slug LIKE 'texas-as-%-2026-27'
   AND NOT EXISTS (SELECT 1 FROM public.gw_all_state_documents d
                    WHERE d.program_id = p.id AND d.url = v.url);

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────
-- DELIBERATELY ABSENT — TMEA does not publish these centrally:
--   • District, Region and Pre-Area audition dates (set by each of 33 Regions)
--   • Region entry fee amounts (Region-set)
--   • Exact audition cuts / measure numbers (Regions reduce cuts from Aug 1)
--   • Per-ensemble seat splits among the three 5A-6A choirs (only the 504
--     track total and per-voice-part counts are published)
--   • Clock times for the Feb 13, 2027 concerts
--   • A results-release date for the Jan 9, 2027 Area auditions
--   • Any explicit live-vs-recorded statement for choir auditions
--   • A single consolidated All-State Choir handbook — no such public PDF
--
-- ⚠️ https://www.tmea.org/all-state/members/ was still showing the 2025-26
-- cycle at retrieval ("2026 All-State musician"), so its dashboard and fee
-- deadlines are PRIOR YEAR and were not used. The $30 figure above comes from
-- the separately updated 2026-27 small-school page.
-- ─────────────────────────────────────────────────────────────────────────

\echo ''
\echo '=== staged Texas rows ==='
SELECT p.slug, p.verification_status,
       (SELECT count(*) FROM public.gw_all_state_dates        d WHERE d.program_id=p.id) AS dates,
       (SELECT count(*) FROM public.gw_all_state_requirements r WHERE r.program_id=p.id) AS reqs,
       (SELECT count(*) FROM public.gw_all_state_repertoire   x WHERE x.program_id=p.id) AS rep,
       (SELECT count(*) FROM public.gw_all_state_fees         f WHERE f.program_id=p.id) AS fees,
       (SELECT count(*) FROM public.gw_all_state_documents    o WHERE o.program_id=p.id) AS docs,
       (SELECT count(*) FROM public.gw_all_state_voice_parts  v WHERE v.program_id=p.id) AS parts
  FROM public.gw_all_state_programs p
 WHERE p.slug LIKE 'texas-as-%-2026-27' ORDER BY p.slug;

NOTIFY pgrst, 'reload schema';
