-- Studio recording sharing (spec: docs/superpowers/specs/2026-08-17-studio-recording-sharing-design.md)
--
-- 1) source_media_id: a "class copy" media row points back at the private
--    Studio-folder original it was shared from (idempotency + provenance).
-- 2) gw_course_assignments.media_id: a standard assignment can carry a
--    playable recording (the class copy, so enrolled students pass RLS).
-- 3) gw_media_item_shares: per-item email grant, mirroring the shipped
--    gw_media_folder_shares (within-tenant only — RESTRICTIVE tenant
--    isolation still ANDs on top).
-- 4) Write-side course gate: only someone who can MANAGE a course may
--    create/point media rows at it (pre-existing gap: course_access_*
--    policies were SELECT-only).

ALTER TABLE public.gw_media_library
  ADD COLUMN IF NOT EXISTS source_media_id uuid
  REFERENCES public.gw_media_library(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS gw_media_library_source_idx
  ON public.gw_media_library (source_media_id)
  WHERE source_media_id IS NOT NULL;

-- Idempotency backstop for ensureClassCopy: two concurrent shares of the
-- same recording to the same class must not produce duplicate copies.
CREATE UNIQUE INDEX IF NOT EXISTS gw_media_library_source_course_uniq
  ON public.gw_media_library (source_media_id, course_id)
  WHERE source_media_id IS NOT NULL AND is_deleted = false;

ALTER TABLE public.gw_course_assignments
  ADD COLUMN IF NOT EXISTS media_id uuid
  REFERENCES public.gw_media_library(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS gw_course_assignments_media_idx
  ON public.gw_course_assignments (media_id) WHERE media_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.gw_media_item_shares (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL DEFAULT public.current_tenant_id(),
  media_id      uuid NOT NULL REFERENCES public.gw_media_library(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  permission    text NOT NULL DEFAULT 'view' CHECK (permission IN ('view')),
  created_by    uuid DEFAULT auth.uid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  revoked_at    timestamptz,
  UNIQUE (media_id, invited_email)
);

CREATE OR REPLACE FUNCTION public.gw_media_item_shares_norm()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.invited_email := lower(trim(NEW.invited_email));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_gw_media_item_shares_norm ON public.gw_media_item_shares;
CREATE TRIGGER trg_gw_media_item_shares_norm
  BEFORE INSERT OR UPDATE ON public.gw_media_item_shares
  FOR EACH ROW EXECUTE FUNCTION public.gw_media_item_shares_norm();

DROP TRIGGER IF EXISTS trg_gw_media_item_shares_set_tenant ON public.gw_media_item_shares;
CREATE TRIGGER trg_gw_media_item_shares_set_tenant
  BEFORE INSERT ON public.gw_media_item_shares
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default();

CREATE INDEX IF NOT EXISTS gw_media_item_shares_grantee_idx
  ON public.gw_media_item_shares (invited_email) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS gw_media_item_shares_media_idx
  ON public.gw_media_item_shares (media_id);

ALTER TABLE public.gw_media_item_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_restrict ON public.gw_media_item_shares
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY media_item_shares_owner_all ON public.gw_media_item_shares
  FOR ALL TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY media_item_shares_grantee_read ON public.gw_media_item_shares
  FOR SELECT TO authenticated
  USING (
    revoked_at IS NULL
    AND lower(invited_email) = lower(auth.jwt() ->> 'email')
  );

DROP POLICY IF EXISTS media_library_item_shared_select ON public.gw_media_library;
CREATE POLICY media_library_item_shared_select ON public.gw_media_library
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.gw_media_item_shares s
    WHERE s.media_id = gw_media_library.id
      AND s.owner_user_id = gw_media_library.uploaded_by
      AND s.revoked_at IS NULL
      AND lower(s.invited_email) = lower(auth.jwt() ->> 'email')
  ));

-- Manage-course check: admins or the course instructor. TAs deliberately
-- excluded in v1 (their model keys on course_code strings).
CREATE OR REPLACE FUNCTION public.user_can_manage_course(p_course_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid() AND (is_admin OR is_super_admin)
  ) OR EXISTS (
    SELECT 1 FROM public.gw_courses
    WHERE id = p_course_id AND instructor_id = auth.uid()
  );
$$;
GRANT EXECUTE ON FUNCTION public.user_can_manage_course(uuid) TO authenticated;

-- Write-side gate. Rows without a course tag pass unchanged; course-tagged
-- writes require managing the course OR writing your own row into a course
-- you can access (preserves the shipped student-upload flow while blocking
-- writes into unrelated courses).
DROP POLICY IF EXISTS course_write_media_library ON public.gw_media_library;
CREATE POLICY course_write_media_library ON public.gw_media_library
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (
    course_id IS NULL
    OR public.user_can_manage_course(course_id)
    OR (uploaded_by = auth.uid() AND public.user_can_access_course(course_id))
  );

DROP POLICY IF EXISTS course_write_media_library_upd ON public.gw_media_library;
CREATE POLICY course_write_media_library_upd ON public.gw_media_library
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (
    course_id IS NULL
    OR public.user_can_manage_course(course_id)
    OR (uploaded_by = auth.uid() AND public.user_can_access_course(course_id))
  );
