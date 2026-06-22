-- Tours become first-class course-owned objects.
--
-- gw_tours previously lived at the tenant level — every course in a tenant
-- saw the same tour pool. For multi-ensemble programs (Chamber Singers
-- and Concert Choir tour separately) that's a real scoping gap. We make
-- tours owned by a specific course.
--
-- Safe because gw_tours currently has zero rows across all tenants — we
-- can add NOT NULL without a backfill.

ALTER TABLE public.gw_tours
  ADD COLUMN course_id uuid NOT NULL
  REFERENCES public.gw_courses(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS gw_tours_course_id_idx
  ON public.gw_tours (course_id);
