-- Phase 24: unify wardrobe with course scope. Add nullable course_id to
-- the rows that actually belong to a class — checkouts, orders,
-- announcements. Inventory stays workspace-wide (a single set of
-- garments shared across all classes). Measurements stay per-user (a
-- student's measurements don't change per class).
--
-- This mirrors the Part Tracks unification (Phase 23.1).

ALTER TABLE public.gw_wardrobe_checkouts
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.gw_courses(id) ON DELETE SET NULL;

ALTER TABLE public.gw_wardrobe_orders
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.gw_courses(id) ON DELETE SET NULL;

ALTER TABLE public.gw_wardrobe_announcements
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.gw_courses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS gw_wardrobe_checkouts_course_idx
  ON public.gw_wardrobe_checkouts(course_id) WHERE course_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS gw_wardrobe_orders_course_idx
  ON public.gw_wardrobe_orders(course_id) WHERE course_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS gw_wardrobe_announcements_course_idx
  ON public.gw_wardrobe_announcements(course_id) WHERE course_id IS NOT NULL;

-- Drop the orphan course-scoped wardrobe tables I created in Phase 19/20.
-- They're empty per the schema audit and never had production data.
DROP TABLE IF EXISTS public.gw_course_wardrobe_completions CASCADE;
DROP TABLE IF EXISTS public.gw_course_wardrobe_items CASCADE;
