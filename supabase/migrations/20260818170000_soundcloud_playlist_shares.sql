-- Sharing for SoundCloud playlists: who sees which set on the Command
-- Center's SoundCloud page.
--
-- Three target kinds, matching what was asked for — individuals by email,
-- Academy classes, and roles (roles stand in for "admin groups"; the four
-- group tables in this schema all mean different things and none of them
-- means "the admins").
--
-- Default is HIDDEN: a playlist with no share row is invisible to
-- non-admins. Admins always see every row so they can manage it.
--
-- Note this is curation, not access control. Every one of these playlists
-- is public on soundcloud.com, so anyone with the link can play it
-- regardless. What this decides is what appears on the page.
--
-- Shape follows gw_media_item_shares (2026-08-17): RESTRICTIVE tenant
-- isolation, email normalized by trigger, revoked_at rather than DELETE so
-- a revoke keeps its audit trail.

CREATE TABLE IF NOT EXISTS public.gw_soundcloud_playlist_shares (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL DEFAULT public.current_tenant_id(),
  -- SoundCloud's own ids. Denormalized title/url so the page can render a
  -- member's shared sets without calling SoundCloud for names.
  playlist_id    bigint NOT NULL,
  playlist_title text,
  playlist_url   text NOT NULL,
  share_type     text NOT NULL CHECK (share_type IN ('role', 'course', 'email')),
  target_role    text CHECK (target_role IN ('admin', 'staff', 'member')),
  course_id      uuid REFERENCES public.gw_courses(id) ON DELETE CASCADE,
  invited_email  text,
  created_by     uuid DEFAULT auth.uid(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  revoked_at     timestamptz,
  -- Exactly one target, matching share_type. Without this a row could name
  -- a course and an email and silently grant more than intended.
  CONSTRAINT gw_scps_one_target CHECK (
    (share_type = 'role'   AND target_role IS NOT NULL AND course_id IS NULL AND invited_email IS NULL) OR
    (share_type = 'course' AND course_id   IS NOT NULL AND target_role IS NULL AND invited_email IS NULL) OR
    (share_type = 'email'  AND invited_email IS NOT NULL AND target_role IS NULL AND course_id IS NULL)
  )
);

-- Re-sharing the same playlist to the same target updates rather than
-- duplicating. Partial uniques because only one target column is ever set.
CREATE UNIQUE INDEX IF NOT EXISTS gw_scps_role_uniq
  ON public.gw_soundcloud_playlist_shares (tenant_id, playlist_id, target_role)
  WHERE share_type = 'role';
CREATE UNIQUE INDEX IF NOT EXISTS gw_scps_course_uniq
  ON public.gw_soundcloud_playlist_shares (tenant_id, playlist_id, course_id)
  WHERE share_type = 'course';
CREATE UNIQUE INDEX IF NOT EXISTS gw_scps_email_uniq
  ON public.gw_soundcloud_playlist_shares (tenant_id, playlist_id, invited_email)
  WHERE share_type = 'email';

CREATE INDEX IF NOT EXISTS gw_scps_playlist_idx
  ON public.gw_soundcloud_playlist_shares (tenant_id, playlist_id)
  WHERE revoked_at IS NULL;

CREATE OR REPLACE FUNCTION public.gw_scps_norm()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.invited_email IS NOT NULL THEN
    NEW.invited_email := lower(trim(NEW.invited_email));
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_gw_scps_norm ON public.gw_soundcloud_playlist_shares;
CREATE TRIGGER trg_gw_scps_norm
  BEFORE INSERT OR UPDATE ON public.gw_soundcloud_playlist_shares
  FOR EACH ROW EXECUTE FUNCTION public.gw_scps_norm();

DROP TRIGGER IF EXISTS trg_gw_scps_set_tenant ON public.gw_soundcloud_playlist_shares;
CREATE TRIGGER trg_gw_scps_set_tenant
  BEFORE INSERT ON public.gw_soundcloud_playlist_shares
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default();

-- Does the caller hold (at least) this role in the current tenant?
-- SECURITY DEFINER so the RLS policy below never reads a table the caller
-- may be restricted from — and never its own table, which is what raises
-- 42P17 infinite recursion.
--
-- Both super_admin spellings are accepted: this schema contains rows with
-- each, and treating one as unprivileged would silently hide content.
CREATE OR REPLACE FUNCTION public.user_has_tenant_role(p_role text)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT CASE
    WHEN public.user_is_admin() THEN true
    WHEN p_role = 'member' THEN EXISTS (
      SELECT 1 FROM public.gw_tenant_members m
       WHERE m.user_id = auth.uid() AND m.tenant_id = public.current_tenant_id())
    WHEN p_role = 'staff' THEN EXISTS (
      SELECT 1 FROM public.gw_tenant_members m
       WHERE m.user_id = auth.uid() AND m.tenant_id = public.current_tenant_id()
         AND m.role IN ('staff', 'admin', 'owner', 'super-admin', 'super_admin'))
    WHEN p_role = 'admin' THEN EXISTS (
      SELECT 1 FROM public.gw_tenant_members m
       WHERE m.user_id = auth.uid() AND m.tenant_id = public.current_tenant_id()
         AND m.role IN ('admin', 'owner', 'super-admin', 'super_admin'))
    ELSE false
  END;
$$;

ALTER TABLE public.gw_soundcloud_playlist_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_restrict ON public.gw_soundcloud_playlist_shares
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- Admins manage every share and see the full picture, including playlists
-- shared with nobody — otherwise they could not administer them.
CREATE POLICY scps_admin_all ON public.gw_soundcloud_playlist_shares
  FOR ALL TO authenticated
  USING (public.user_is_admin())
  WITH CHECK (public.user_is_admin());

-- Everyone else reads only the shares that name them. A member cannot list
-- the titles of playlists kept from them: enforcement is here, not in the UI.
CREATE POLICY scps_grantee_read ON public.gw_soundcloud_playlist_shares
  FOR SELECT TO authenticated
  USING (
    revoked_at IS NULL
    AND (
      (share_type = 'email'
         AND lower(invited_email) = lower(auth.jwt() ->> 'email'))
      OR (share_type = 'role'
         AND public.user_has_tenant_role(target_role))
      OR (share_type = 'course' AND EXISTS (
            SELECT 1 FROM public.gw_course_enrollments e
             WHERE e.course_id = gw_soundcloud_playlist_shares.course_id
               AND e.user_id = auth.uid()))
    )
  );

COMMENT ON TABLE public.gw_soundcloud_playlist_shares IS
  'Who sees which SoundCloud playlist on the Command Center page. No row = hidden from non-admins. Curation, not access control: the playlists are public on soundcloud.com.';
