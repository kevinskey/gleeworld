-- Georgia All-State Chorus, 2026-27 season — hand-entered Layer 1 data.
--
-- PROVENANCE: every fact below was read off a GMEA-published page on
-- 2026-08-07 and carries its source URL. Nothing here is inferred, and
-- nothing is filled in from general knowledge of how All-State programs
-- usually work. Where GMEA has not published something it is ABSENT, not
-- guessed — see the "NOT PUBLISHED" list at the bottom.
--
-- ⚠️ PUBLISHED AS pending_verification, NOT verified.
-- The RLS read policy gates anon/authenticated SELECT on
-- verification_status = 'verified', so NONE of this is publicly visible
-- until a human confirms it. That is deliberate: the credibility of this
-- feature rests on a director being able to trust the badge, and "a
-- machine read it off a webpage" is not the same as "we checked."
--
-- To publish after review:
--   UPDATE public.gw_all_state_programs
--      SET verification_status = 'verified',
--          verified_at = now(),
--          verified_by = '<your auth.users id>'
--    WHERE slug LIKE 'georgia-asc-%-2026-27';
--   UPDATE public.gw_all_state_states SET active = true WHERE slug = 'georgia';
--
-- MODELLING NOTE — why three programs by grade bracket rather than the seven
-- named ensembles (Middle School Treble, Senior Tenor/Bass, …): those seven
-- labels appear on GMEA's conductors page, which is still headed "All-State
-- Chorus 2026" — i.e. last season. GMEA has NOT published 2026-27 ensemble
-- divisions. What it HAS published for 2026-27 is audition material split by
-- 7-8 / 9-10 / 11-12, with different required scales per bracket. So the
-- brackets are the real, sourced 2026-27 unit. When GMEA posts the 2027
-- ensembles, add them as additional programs sharing the same lineage keys.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- Organization
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO public.gw_all_state_organizations (state_id, name, acronym, website_url, description)
SELECT s.id,
       'Georgia Music Educators Association', 'GMEA', 'https://www.gmea.org/',
       'Georgia''s NAfME state affiliate, based in Stockbridge, GA. Administers All-State Chorus, All-State Reading Chorus, statewide honor choruses, and Chorus LGPE. Registration and payment run through GMEA''s Opus system at https://opus.gmea.org/.'
  FROM public.gw_all_state_states s WHERE s.slug = 'georgia'
ON CONFLICT (state_id, name) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────
-- Sources — registered now so hand-entered facts carry provenance from day
-- one, and so Phase 4 monitoring has real rows to attach to.
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO public.gw_all_state_sources
  (state_id, organization_id, name, domain, url, source_type, trust_level, retrieved_at)
SELECT s.id, o.id, v.name, 'gmea.org', v.url, v.stype, 'official', TIMESTAMPTZ '2026-08-07 00:00:00-04'
  FROM public.gw_all_state_states s
  JOIN public.gw_all_state_organizations o ON o.state_id = s.id AND o.acronym = 'GMEA'
  CROSS JOIN (VALUES
    ('GMEA 2026-27 Statewide Calendar (approved 5/16/2026)',
     'https://docs.google.com/document/d/1p17s-MXuD9STUcUSbGWlKkapGBOs4pg2b54DOr_p3AE/edit', 'calendar'),
    ('GMEA All-State Chorus — Audition Information',
     'https://www.gmea.org/asc-audition-information', 'official'),
    ('GMEA All-State Chorus — Event Information',
     'https://www.gmea.org/asc-information', 'official'),
    ('GMEA All-State Chorus Rules and Regulations (Jan 2024)',
     'https://www.gmea.org/s/2024-ASC-Rules-and-Regulations-e4l7.pdf', 'handbook_pdf'),
    ('GMEA Sight Reading Score Sheet',
     'https://www.gmea.org/s/Sight-Reading-Score-Sheet-rv2-25.pdf', 'official'),
    ('GMEA Choral Division index',
     'https://www.gmea.org/choral', 'official')
  ) AS v(name, url, stype)
 WHERE s.slug = 'georgia'
   AND NOT EXISTS (SELECT 1 FROM public.gw_all_state_sources x WHERE x.url = v.url);

-- ─────────────────────────────────────────────────────────────────────────
-- Programs — three grade brackets, season 2026-27.
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO public.gw_all_state_programs
  (state_id, organization_id, name, slug, season, lineage_key, school_level, ensemble_type,
   description, verification_status)
SELECT s.id, o.id, v.name, v.slug, '2026-27', v.lineage, v.level, 'chorus',
       v.descr, 'pending_verification'
  FROM public.gw_all_state_states s
  JOIN public.gw_all_state_organizations o ON o.state_id = s.id AND o.acronym = 'GMEA'
  CROSS JOIN (VALUES
    ('All-State Chorus — 7th & 8th Grade', 'georgia-asc-7-8-2026-27', 'georgia-asc-7-8', 'middle',
     'Middle school bracket of GMEA All-State Chorus. Two audition rounds: region auditions in November, final auditions in January.'),
    ('All-State Chorus — 9th & 10th Grade', 'georgia-asc-9-10-2026-27', 'georgia-asc-9-10', 'high',
     'Underclass high school bracket of GMEA All-State Chorus. Two audition rounds: region auditions in November, final auditions in January.'),
    ('All-State Chorus — 11th & 12th Grade', 'georgia-asc-11-12-2026-27', 'georgia-asc-11-12', 'high',
     'Upperclass high school bracket of GMEA All-State Chorus. Two audition rounds: region auditions in November, final auditions in January.')
  ) AS v(name, slug, lineage, level, descr)
 WHERE s.slug = 'georgia'
ON CONFLICT (lineage_key, season) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────
-- Dates — identical across all three brackets (GMEA publishes one ASC
-- calendar). all_day = true throughout: GMEA publishes NO clock times.
-- Source: 2026-27 Statewide Calendar, corroborated on /asc-information.
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO public.gw_all_state_dates
  (program_id, date_type, title, start_at, end_at, all_day, timezone, description,
   source_id, source_url, retrieved_at, confidence, sort_order)
SELECT p.id, v.dtype, v.title, v.starts, v.ends, true, 'America/New_York', v.descr,
       src.id, src.url, TIMESTAMPTZ '2026-08-07 00:00:00-04', 'official_source', v.ord
  FROM public.gw_all_state_programs p
  JOIN public.gw_all_state_sources src
    ON src.url = 'https://docs.google.com/document/d/1p17s-MXuD9STUcUSbGWlKkapGBOs4pg2b54DOr_p3AE/edit'
  CROSS JOIN (VALUES
    ('registration_deadline', 'Registration and payment due',
     TIMESTAMPTZ '2026-09-15 00:00:00-04', NULL::timestamptz,
     'Postmark deadline. Students are registered by their chorus director through Opus, not individually. GMEA publishes no time of day.', 10),
    ('audition_round', 'Region auditions (first audition)',
     TIMESTAMPTZ '2026-11-07 00:00:00-05', NULL::timestamptz,
     'Held in person at five regional sites. Not a recorded submission.', 20),
    ('acceptance_deadline', 'Acceptance form and payment due',
     TIMESTAMPTZ '2026-12-15 00:00:00-05', NULL::timestamptz,
     'Postmark deadline for students advancing past the first audition.', 30),
    ('audition_round', 'Final auditions (second audition)',
     TIMESTAMPTZ '2027-01-20 00:00:00-05', TIMESTAMPTZ '2027-01-23 00:00:00-05',
     'Districts choose one date within this window. Rehearsal tracks are emailed to the directors of accepted students.', 40),
    ('event', 'All-State Chorus',
     TIMESTAMPTZ '2027-02-18 00:00:00-05', TIMESTAMPTZ '2027-02-20 00:00:00-05',
     'The Classic Center, Athens, Georgia.', 50)
  ) AS v(dtype, title, starts, ends, descr, ord)
 WHERE p.slug LIKE 'georgia-asc-%-2026-27'
   AND NOT EXISTS (
     SELECT 1 FROM public.gw_all_state_dates d
      WHERE d.program_id = p.id AND d.title = v.title);

-- ─────────────────────────────────────────────────────────────────────────
-- Requirements. Scales differ by bracket — 11/12 uses HARMONIC minor where
-- the younger brackets use natural minor. That difference is exactly the
-- kind of thing a generic task generator must read from data rather than
-- hardcode, which is the point of this table.
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO public.gw_all_state_requirements
  (program_id, category, title, description, structured_data,
   source_id, source_url, retrieved_at, confidence, sort_order)
SELECT p.id, 'scales', 'Required scales', v.descr,
       jsonb_build_object('scales', v.scales),
       src.id, src.url, TIMESTAMPTZ '2026-08-07 00:00:00-04', 'official_source', 20
  FROM public.gw_all_state_programs p
  JOIN public.gw_all_state_sources src ON src.url = 'https://www.gmea.org/asc-audition-information'
  CROSS JOIN (VALUES
    ('georgia-asc-7-8-2026-27',   'Major, natural minor, and chromatic.',  '["major","natural_minor","chromatic"]'::jsonb),
    ('georgia-asc-9-10-2026-27',  'Major, natural minor, and chromatic.',  '["major","natural_minor","chromatic"]'::jsonb),
    ('georgia-asc-11-12-2026-27', 'Major, harmonic minor, and chromatic.', '["major","harmonic_minor","chromatic"]'::jsonb)
  ) AS v(slug, descr, scales)
 WHERE p.slug = v.slug
   AND NOT EXISTS (SELECT 1 FROM public.gw_all_state_requirements r
                    WHERE r.program_id = p.id AND r.title = 'Required scales');

-- Requirements shared across all three brackets.
INSERT INTO public.gw_all_state_requirements
  (program_id, category, title, description, structured_data,
   source_id, source_url, retrieved_at, confidence, sort_order)
-- source_id via scalar subquery rather than a JOIN: the join condition would
-- reference v.surl, and v is defined by a CROSS JOIN later in the FROM list,
-- which Postgres cannot resolve.
SELECT p.id, v.cat, v.title, v.descr, v.sdata,
       (SELECT s2.id FROM public.gw_all_state_sources s2 WHERE s2.url = v.surl LIMIT 1),
       v.surl, TIMESTAMPTZ '2026-08-07 00:00:00-04', 'official_source', v.ord
  FROM public.gw_all_state_programs p
  CROSS JOIN (VALUES
    ('membership', 'Director must be a current GMEA/NAfME member',
     'Students cannot register themselves. The registering director must hold current GMEA/NAfME membership, and the application lives in the director''s Opus account. Where no school program exists, a GMEA-member private teacher who is directly responsible for instruction on the All-State music may register the student.',
     '{}'::jsonb, 'https://www.gmea.org/asc-information', 10),
    ('materials', 'Prepare one solo from the two published options',
     'GMEA publishes two solos per grade bracket. The student performs ONE.',
     '{"choose": 1, "of": 2}'::jsonb, 'https://www.gmea.org/asc-audition-information', 30),
    ('sight_reading', 'Sight-reading — three examples',
     'Scored on three examples. Credit is given per half-measure for correct pitches and rhythms, with additional intonation and tempo scoring. There is a study period and an enforced time limit.',
     '{"examples": 3}'::jsonb, 'https://www.gmea.org/s/Sight-Reading-Score-Sheet-rv2-25.pdf', 40),
    ('rubric', 'Solo scored on six criteria',
     'Pitch accuracy, rhythmic accuracy, vocal tone, diction, phrasing/breath, and musicality — each scored 0 to 5.',
     '{"criteria": ["pitch_accuracy","rhythmic_accuracy","vocal_tone","diction","phrasing_breath","musicality"], "scale_max": 5}'::jsonb,
     'https://www.gmea.org/asc-audition-information', 50),
    ('format', 'Auditions are in person, not recorded',
     'First auditions are held at five regional sites. GMEA publishes no recorded or digital submission option.',
     '{}'::jsonb, 'https://www.gmea.org/asc-audition-information', 60)
  ) AS v(cat, title, descr, sdata, surl, ord)
 WHERE p.slug LIKE 'georgia-asc-%-2026-27'
   AND NOT EXISTS (SELECT 1 FROM public.gw_all_state_requirements r
                    WHERE r.program_id = p.id AND r.title = v.title);

-- ─────────────────────────────────────────────────────────────────────────
-- Audition solos. Titles only, per GMEA's own spelling. Composers, arrangers,
-- editions, keys and voicings are NOT PUBLISHED by GMEA and are therefore
-- left NULL rather than looked up elsewhere — a plausible-looking composer
-- attribution that turns out to be the wrong edition is worse than a blank.
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO public.gw_all_state_repertoire
  (program_id, title, purpose, notes, source_url, sort_order)
SELECT p.id, v.title, 'audition',
       'Composer and edition not published by GMEA. Confirm the required edition with your district organizer.',
       'https://www.gmea.org/asc-audition-information', v.ord
  FROM public.gw_all_state_programs p
  CROSS JOIN (VALUES
    ('georgia-asc-7-8-2026-27',   'Scarborough Fair',      10),
    ('georgia-asc-7-8-2026-27',   'Oh Shenandoah',         20),
    ('georgia-asc-9-10-2026-27',  'Per la gloria',         10),
    ('georgia-asc-9-10-2026-27',  'Caro mio ben',          20),
    ('georgia-asc-11-12-2026-27', 'Se Florindo è fedele',  10),
    ('georgia-asc-11-12-2026-27', 'Lasciatemi morire',     20)
  ) AS v(slug, title, ord)
 WHERE p.slug = v.slug
   AND NOT EXISTS (SELECT 1 FROM public.gw_all_state_repertoire r
                    WHERE r.program_id = p.id AND r.title = v.title);

-- ─────────────────────────────────────────────────────────────────────────
-- Voice parts. GMEA spells these out ("Soprano 1"), it does NOT use the
-- SI/SII form. `code` is our stable key; `label` is GMEA's own wording.
-- Note the near-miss with gw_profiles.voice_part (S1..B2) — close enough
-- that Georgia's section mapping is nearly an identity, which is luck
-- rather than a rule.
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO public.gw_all_state_voice_parts (program_id, code, label, sort_order)
SELECT p.id, v.code, v.label, v.ord
  FROM public.gw_all_state_programs p
  CROSS JOIN (VALUES
    ('S1','Soprano 1',10), ('S2','Soprano 2',20),
    ('A1','Alto 1',30),    ('A2','Alto 2',40),
    ('T1','Tenor 1',50),   ('T2','Tenor 2',60),
    ('B1','Bass 1',70),    ('B2','Bass 2',80)
  ) AS v(code, label, ord)
 WHERE p.slug LIKE 'georgia-asc-%-2026-27'
ON CONFLICT (program_id, code) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────
-- Documents
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO public.gw_all_state_documents
  (program_id, title, document_type, url, retrieved_at, source_id, sort_order)
SELECT p.id, v.title, v.dtype, v.url, TIMESTAMPTZ '2026-08-07 00:00:00-04',
       (SELECT s2.id FROM public.gw_all_state_sources s2 WHERE s2.url = v.url LIMIT 1),
       v.ord
  FROM public.gw_all_state_programs p
  CROSS JOIN (VALUES
    ('All-State Chorus Rules and Regulations', 'rules',
     'https://www.gmea.org/s/2024-ASC-Rules-and-Regulations-e4l7.pdf', 10),
    ('Sight Reading Score Sheet', 'form',
     'https://www.gmea.org/s/Sight-Reading-Score-Sheet-rv2-25.pdf', 20),
    ('2026-27 GMEA Statewide Calendar', 'calendar',
     'https://docs.google.com/document/d/1p17s-MXuD9STUcUSbGWlKkapGBOs4pg2b54DOr_p3AE/edit', 30),
    ('All-State Chorus audition information', 'rules',
     'https://www.gmea.org/asc-audition-information', 40)
  ) AS v(title, dtype, url, ord)
 WHERE p.slug LIKE 'georgia-asc-%-2026-27'
   AND NOT EXISTS (SELECT 1 FROM public.gw_all_state_documents d
                    WHERE d.program_id = p.id AND d.url = v.url);

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────
-- DELIBERATELY ABSENT — GMEA publishes none of the following publicly, so
-- there are no rows for them. Do not backfill from third-party sites.
--
--   • FEE AMOUNTS. The calendar confirms payment is due at registration
--     (Sept 15) and again with the acceptance form (Dec 15), and that it
--     runs through Opus — but no dollar figures appear on any public GMEA
--     page. They sit behind the Opus login / members' handbook. School and
--     studio websites quote numbers; those are not authoritative.
--   • Times of day and timezone for any deadline (hence all_day = true).
--   • Results / acceptance announcement date.
--   • 2027 conductors, 2027 ensemble divisions, 2027 performance repertoire.
--   • Composers, arrangers, editions, keys for the audition solos.
--   • Explicit eligibility statement (grade range, residency, enrollment).
--   • A 2026-27 revision of the Rules and Regulations — latest is Jan 2024.
--   • Quota / number accepted per section.
--
-- Also noted: GMEA's own /choral Calendar link is broken (target deleted),
-- and /who-we-are says "six all-state choruses" while /asc-conductors lists
-- seven. Both are GMEA's, unreconciled.
-- ─────────────────────────────────────────────────────────────────────────

\echo ''
\echo '=== staged Georgia rows (nothing public until verification_status flips) ==='
SELECT p.slug, p.verification_status,
       (SELECT count(*) FROM public.gw_all_state_dates        d WHERE d.program_id = p.id) AS dates,
       (SELECT count(*) FROM public.gw_all_state_requirements r WHERE r.program_id = p.id) AS reqs,
       (SELECT count(*) FROM public.gw_all_state_repertoire   x WHERE x.program_id = p.id) AS rep,
       (SELECT count(*) FROM public.gw_all_state_fees         f WHERE f.program_id = p.id) AS fees,
       (SELECT count(*) FROM public.gw_all_state_documents    o WHERE o.program_id = p.id) AS docs,
       (SELECT count(*) FROM public.gw_all_state_voice_parts  v WHERE v.program_id = p.id) AS parts
  FROM public.gw_all_state_programs p
 WHERE p.slug LIKE 'georgia-asc-%-2026-27'
 ORDER BY p.slug;

NOTIFY pgrst, 'reload schema';
