-- Phase 14: per-course tour itinerary stops.
-- One row per tour stop. Tour itineraries are course-scoped, not workspace-scoped.

CREATE TABLE IF NOT EXISTS public.gw_course_tour_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.gw_courses(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  stop_date date,
  city text,
  venue text,
  address text,
  notes text,
  tenant_id uuid DEFAULT current_tenant_id(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gw_course_tour_stops_course_idx
  ON public.gw_course_tour_stops(course_id, position);

ALTER TABLE public.gw_course_tour_stops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_course_tour_stops;
CREATE POLICY tenant_isolation_restrict ON public.gw_course_tour_stops
  AS RESTRICTIVE
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Instructor manages tour stops" ON public.gw_course_tour_stops;
CREATE POLICY "Instructor manages tour stops" ON public.gw_course_tour_stops
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_courses c
      WHERE c.id = gw_course_tour_stops.course_id
        AND (c.instructor_id = auth.uid() OR c.created_by = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin OR p.is_super_admin))
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gw_courses c
      WHERE c.id = gw_course_tour_stops.course_id
        AND (c.instructor_id = auth.uid() OR c.created_by = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin OR p.is_super_admin))
  );

DROP POLICY IF EXISTS "Enrolled students read tour stops" ON public.gw_course_tour_stops;
CREATE POLICY "Enrolled students read tour stops" ON public.gw_course_tour_stops
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_course_enrollments e
      WHERE e.course_id = gw_course_tour_stops.course_id
        AND e.user_id = auth.uid()
        AND e.enrollment_status IN ('enrolled','active','in_progress','registered')
    )
  );


-- Phase 14: per-course public landing page content.
-- One row per course. The /class/:slug public route renders this.

CREATE TABLE IF NOT EXISTS public.gw_course_landing_pages (
  course_id uuid PRIMARY KEY REFERENCES public.gw_courses(id) ON DELETE CASCADE,
  is_published boolean NOT NULL DEFAULT false,
  hero_title text,
  tagline text,
  hero_image_url text,
  body_markdown text,
  cta_label text,
  cta_url text,
  tenant_id uuid DEFAULT current_tenant_id(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gw_course_landing_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_course_landing_pages;
CREATE POLICY tenant_isolation_restrict ON public.gw_course_landing_pages
  AS RESTRICTIVE
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Instructor manages
DROP POLICY IF EXISTS "Instructor manages landing" ON public.gw_course_landing_pages;
CREATE POLICY "Instructor manages landing" ON public.gw_course_landing_pages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_courses c
      WHERE c.id = gw_course_landing_pages.course_id
        AND (c.instructor_id = auth.uid() OR c.created_by = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin OR p.is_super_admin))
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gw_courses c
      WHERE c.id = gw_course_landing_pages.course_id
        AND (c.instructor_id = auth.uid() OR c.created_by = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin OR p.is_super_admin))
  );

-- Anyone can read a PUBLISHED landing (public-facing).
DROP POLICY IF EXISTS "Anyone reads published landings" ON public.gw_course_landing_pages;
CREATE POLICY "Anyone reads published landings" ON public.gw_course_landing_pages
  FOR SELECT
  USING (is_published = true);
