-- Phase 24 batch: add nullable course_id to the workspace-level "parent"
-- table for each module that has a clear per-course unit of ownership.
-- Same pattern as Wardrobe (Phase 24) and Part Tracks (Phase 23.1).
--
-- Coverage:
--   • Tour Manager → gw_tour_events  (a tour belongs to a class)
--   • Auditions    → gw_auditions    (audition cycle belongs to a class)
--   • Buckets of Love → gw_buckets_of_love (campaign can be class-driven)
--
-- PR Hub and Librarian don't have a single owning table that makes sense
-- to course-scope, so those keep the embed-only addon pattern.

ALTER TABLE public.gw_tour_events
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.gw_courses(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS gw_tour_events_course_idx
  ON public.gw_tour_events(course_id) WHERE course_id IS NOT NULL;

ALTER TABLE public.gw_auditions
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.gw_courses(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS gw_auditions_course_idx
  ON public.gw_auditions(course_id) WHERE course_id IS NOT NULL;

ALTER TABLE public.gw_buckets_of_love
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.gw_courses(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS gw_buckets_of_love_course_idx
  ON public.gw_buckets_of_love(course_id) WHERE course_id IS NOT NULL;

-- Drop the unused Phase 14 tour-stops table — superseded by gw_tour_events
-- with the new course_id column.
DROP TABLE IF EXISTS public.gw_course_tour_stops CASCADE;
