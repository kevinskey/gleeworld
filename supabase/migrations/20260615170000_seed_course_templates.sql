-- Course Template catalog
--
-- Two changes here:
--   1. Allow cross-tenant SELECT for rows marked `is_template = true`.
--      Templates are a shared platform catalog — every tenant should see
--      the same starter set in /academy/store. Writes stay strictly
--      tenant-scoped (only `main` can update its own templates).
--   2. Seed 5 starter templates on the `main` tenant.
--
-- The catalog query pattern (frontend, CourseStorePage):
--   SELECT id, course_code, title, description, instructor_name
--   FROM gw_courses
--   WHERE is_template = true AND is_active = true;
--
-- Adoption clones the template into the calling tenant via the
-- existing `adopt_course_template` RPC (security definer).

-- ── 1. Relax RESTRICTIVE policy: SELECT allows templates, writes stay strict ──

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_courses;

CREATE POLICY tenant_isolation_select ON public.gw_courses
  AS RESTRICTIVE
  FOR SELECT
  USING (tenant_id = current_tenant_id() OR is_template = true);

CREATE POLICY tenant_isolation_insert ON public.gw_courses
  AS RESTRICTIVE
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_update ON public.gw_courses
  AS RESTRICTIVE
  FOR UPDATE
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_delete ON public.gw_courses
  AS RESTRICTIVE
  FOR DELETE
  USING (tenant_id = current_tenant_id());

-- ── 2. Seed starter templates onto the `main` tenant ─────────────────────────

INSERT INTO public.gw_courses
  (tenant_id, course_code, title, description, instructor_name, is_template, is_active, is_free, semester)
SELECT
  (SELECT id FROM public.gw_tenants WHERE slug = 'main'),
  v.course_code, v.title, v.description, v.instructor_name,
  true, true, true, 'TEMPLATE'
FROM (VALUES
  (
    'TPL-CHOIR101',
    'Choir Foundations: Ensemble Singing',
    'A canonical first-semester choir course. Includes weekly rehearsal sessions, sectionals, part-tracks, attendance, vocal warmups, and a concert-prep arc. Drop in your repertoire and tenant''s schedule, ready to teach in under an hour.',
    'Template'
  ),
  (
    'TPL-THEORY100',
    'Music Theory Fundamentals',
    'A 14-week foundational theory course covering staff reading, intervals, scales, triads, basic harmony, and ear training. Includes weekly quizzes, sight-singing drills, and a midterm/final exam scaffold.',
    'Template'
  ),
  (
    'TPL-CONDUCT200',
    'Conducting Basics',
    'Intro to score study, baton technique, and rehearsal craft. Built around weekly video assignments, peer review, and a culminating podium project. Pairs with the GleeWorld video-submission and rubric grading workflow.',
    'Template'
  ),
  (
    'TPL-VOICE150',
    'Vocal Pedagogy & Studio Voice',
    'A studio-voice template for applied lesson tracking, weekly journals, repertoire logs, and recital prep. Includes attendance, journal prompts, and a built-in jury / barrier-exam flow.',
    'Template'
  ),
  (
    'TPL-SIGHT110',
    'Sight Singing & Ear Training',
    'A daily-drill template wired to the GleeWorld sight-reading and pitch-pipe modules. Tracks individual progress across solfege, interval recognition, and short melodic dictations with weekly check-ins.',
    'Template'
  )
) AS v(course_code, title, description, instructor_name)
ON CONFLICT (course_code) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  is_template = true,
  is_active = true;
