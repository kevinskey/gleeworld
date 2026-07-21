-- Part-tracks projects private-by-default (2026-07-20, per Kevin).
--
-- Before: `part_tracks_projects_rw` was TO authenticated USING(true)
-- WITH CHECK(true) — every member of the tenant could read AND WRITE every
-- other member's projects (subject to the RESTRICTIVE tenant_isolation).
-- That's the source of the "backing track works on original login but
-- doesn't save after logging in again" report: a re-authed user could land
-- on another person's project by URL, then the RESTRICTIVE tenant check +
-- session-state divergence would silently reject their write.
--
-- After: projects are OWNED by created_by. Only the owner can update or
-- delete; other tenant members see nothing unless the owner sets is_shared.
-- Sub-tables (tracks + recordings) enforce the same shape via the parent
-- project.

-- ── 1. Add is_shared to projects ─────────────────────────────────────
ALTER TABLE public.gw_part_tracks_projects
  ADD COLUMN IF NOT EXISTS is_shared boolean NOT NULL DEFAULT false;

-- Preserve the pre-migration behavior for LEGACY rows so no ensemble
-- loses their shared library on this deploy. New projects created after
-- this migration will default to private.
UPDATE public.gw_part_tracks_projects
SET is_shared = true
WHERE is_shared = false;

-- ── 2. Rewrite the projects policy ──────────────────────────────────
-- Read: owner OR shared. Write: owner only. INSERT WITH CHECK is
-- owner-only (the created_by trigger below fills the value if the
-- client didn't).
DROP POLICY IF EXISTS part_tracks_projects_rw ON public.gw_part_tracks_projects;

CREATE POLICY part_tracks_projects_read ON public.gw_part_tracks_projects
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR is_shared = true);

CREATE POLICY part_tracks_projects_write ON public.gw_part_tracks_projects
  FOR ALL TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid() OR created_by IS NULL);

-- ── 3. Default created_by to auth.uid() on insert ───────────────────
-- Client already sets created_by from useAuth().user.id in the happy
-- path, but a trigger closes the gap for future callers (edge fn, admin
-- backfills, mobile client that forgets the field) so the RLS check
-- above can't be circumvented by "forgot to send created_by".
CREATE OR REPLACE FUNCTION public.gw_part_tracks_projects_set_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gw_part_tracks_projects_set_owner
  ON public.gw_part_tracks_projects;
CREATE TRIGGER trg_gw_part_tracks_projects_set_owner
  BEFORE INSERT ON public.gw_part_tracks_projects
  FOR EACH ROW EXECUTE FUNCTION public.gw_part_tracks_projects_set_owner();

-- ── 4. Tighten tracks + recordings via the parent project ───────────
-- Previous policies on the sub-tables mirror `USING(true)`. Now they
-- inherit the parent's owner/shared shape so a stray UPDATE against
-- gw_part_tracks_tracks or gw_part_tracks_recordings can't leak.

-- gw_part_tracks_tracks
DROP POLICY IF EXISTS part_tracks_tracks_rw ON public.gw_part_tracks_tracks;
CREATE POLICY part_tracks_tracks_read ON public.gw_part_tracks_tracks
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.gw_part_tracks_projects p
    WHERE p.id = gw_part_tracks_tracks.project_id
      AND (p.created_by = auth.uid() OR p.is_shared = true)
  ));
CREATE POLICY part_tracks_tracks_write ON public.gw_part_tracks_tracks
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.gw_part_tracks_projects p
    WHERE p.id = gw_part_tracks_tracks.project_id
      AND p.created_by = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.gw_part_tracks_projects p
    WHERE p.id = gw_part_tracks_tracks.project_id
      AND p.created_by = auth.uid()
  ));

-- gw_part_tracks_recordings (the vocal takes). Owner of the recording is
-- the singer; but write access rides on the parent project's owner-check
-- to keep the model simple. If teachers need to hear/comment on a take,
-- share the project.
DROP POLICY IF EXISTS part_tracks_recordings_rw ON public.gw_part_tracks_recordings;
CREATE POLICY part_tracks_recordings_read ON public.gw_part_tracks_recordings
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.gw_part_tracks_projects p
    WHERE p.id = gw_part_tracks_recordings.project_id
      AND (p.created_by = auth.uid() OR p.is_shared = true)
  ));
CREATE POLICY part_tracks_recordings_write ON public.gw_part_tracks_recordings
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.gw_part_tracks_projects p
    WHERE p.id = gw_part_tracks_recordings.project_id
      AND p.created_by = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.gw_part_tracks_projects p
    WHERE p.id = gw_part_tracks_recordings.project_id
      AND p.created_by = auth.uid()
  ));
