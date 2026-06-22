-- Phase 11: per-module prerequisite + display_order safety net.
-- A module can declare ONE prerequisite (keep simple; can expand later).
-- The student-side "locked" badge reads this.

ALTER TABLE public.gw_course_modules
  ADD COLUMN IF NOT EXISTS prerequisite_module_id uuid REFERENCES public.gw_course_modules(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS gw_course_modules_prereq_idx
  ON public.gw_course_modules(prerequisite_module_id);
