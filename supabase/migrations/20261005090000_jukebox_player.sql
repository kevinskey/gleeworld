-- Jukebox: the self-hosted replacement for the Command Center's SoundCloud
-- page. Tracks are files we store ourselves (DO Spaces), rows here; playlists
-- are curated in-app; sharing mirrors gw_soundcloud_playlist_shares
-- (2026-08-18) exactly — role / course / email targets, default HIDDEN,
-- revoked_at rather than DELETE.
--
-- Why it exists: the SoundCloud widget was the only route to full audio on
-- someone else's infrastructure. With the catalog mirrored into our own
-- bucket there is no rate limit, no 30-second preview trap, and playlists
-- can hold anything we store — not just what one SoundCloud account owns.
--
-- Sharing is curation, not access control: the audio files are public
-- objects on the CDN (as the same tracks are public on soundcloud.com).
-- What a share row decides is what appears on a member's page.

-- ---------------------------------------------------------------- tracks
CREATE TABLE IF NOT EXISTS public.gw_jukebox_tracks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL DEFAULT public.current_tenant_id(),
  title        text NOT NULL,
  -- The day the track was first published on its source platform — shown in
  -- the song table and used as the default sort, so keep it even for files
  -- that never lived on SoundCloud (NULL is fine).
  upload_date  date,
  -- Where the row came from. 'soundcloud' rows carry the original track id
  -- so a future re-import can upsert instead of duplicating.
  source       text NOT NULL DEFAULT 'upload',
  source_id    bigint,
  audio_url    text NOT NULL,
  duration_ms  integer,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS gw_jukebox_tracks_source_uniq
  ON public.gw_jukebox_tracks (tenant_id, source, source_id)
  WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS gw_jukebox_tracks_tenant_idx
  ON public.gw_jukebox_tracks (tenant_id);

DROP TRIGGER IF EXISTS trg_gw_jukebox_tracks_tenant ON public.gw_jukebox_tracks;
CREATE TRIGGER trg_gw_jukebox_tracks_tenant
  BEFORE INSERT ON public.gw_jukebox_tracks
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default();

-- ------------------------------------------------------------- playlists
CREATE TABLE IF NOT EXISTS public.gw_jukebox_playlists (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL DEFAULT public.current_tenant_id(),
  title       text NOT NULL,
  description text,
  created_by  uuid DEFAULT auth.uid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_jukebox_playlists_tenant_idx
  ON public.gw_jukebox_playlists (tenant_id);

DROP TRIGGER IF EXISTS trg_gw_jukebox_playlists_tenant ON public.gw_jukebox_playlists;
CREATE TRIGGER trg_gw_jukebox_playlists_tenant
  BEFORE INSERT ON public.gw_jukebox_playlists
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default();

CREATE TABLE IF NOT EXISTS public.gw_jukebox_playlist_tracks (
  playlist_id uuid NOT NULL REFERENCES public.gw_jukebox_playlists(id) ON DELETE CASCADE,
  track_id    uuid NOT NULL REFERENCES public.gw_jukebox_tracks(id) ON DELETE CASCADE,
  position    integer NOT NULL DEFAULT 0,
  added_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (playlist_id, track_id)
);

-- ---------------------------------------------------------------- shares
-- Clone of gw_soundcloud_playlist_shares with a uuid playlist FK. Title is
-- denormalized the same way so a member's page renders without joining a
-- table their RLS may not let them read.
CREATE TABLE IF NOT EXISTS public.gw_jukebox_playlist_shares (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL DEFAULT public.current_tenant_id(),
  playlist_id    uuid NOT NULL REFERENCES public.gw_jukebox_playlists(id) ON DELETE CASCADE,
  playlist_title text,
  share_type     text NOT NULL CHECK (share_type IN ('role', 'course', 'email')),
  target_role    text CHECK (target_role IN ('admin', 'staff', 'member')),
  course_id      uuid REFERENCES public.gw_courses(id) ON DELETE CASCADE,
  invited_email  text,
  created_by     uuid DEFAULT auth.uid(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  revoked_at     timestamptz,
  CONSTRAINT gw_jps_one_target CHECK (
    (share_type = 'role'   AND target_role IS NOT NULL AND course_id IS NULL AND invited_email IS NULL) OR
    (share_type = 'course' AND course_id   IS NOT NULL AND target_role IS NULL AND invited_email IS NULL) OR
    (share_type = 'email'  AND invited_email IS NOT NULL AND target_role IS NULL AND course_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS gw_jps_role_uniq
  ON public.gw_jukebox_playlist_shares (tenant_id, playlist_id, target_role)
  WHERE share_type = 'role';
CREATE UNIQUE INDEX IF NOT EXISTS gw_jps_course_uniq
  ON public.gw_jukebox_playlist_shares (tenant_id, playlist_id, course_id)
  WHERE share_type = 'course';
CREATE UNIQUE INDEX IF NOT EXISTS gw_jps_email_uniq
  ON public.gw_jukebox_playlist_shares (tenant_id, playlist_id, invited_email)
  WHERE share_type = 'email';

CREATE INDEX IF NOT EXISTS gw_jps_playlist_idx
  ON public.gw_jukebox_playlist_shares (tenant_id, playlist_id)
  WHERE revoked_at IS NULL;

CREATE OR REPLACE FUNCTION public.gw_jps_norm()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.invited_email IS NOT NULL THEN
    NEW.invited_email := lower(trim(NEW.invited_email));
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_gw_jps_norm ON public.gw_jukebox_playlist_shares;
CREATE TRIGGER trg_gw_jps_norm
  BEFORE INSERT OR UPDATE ON public.gw_jukebox_playlist_shares
  FOR EACH ROW EXECUTE FUNCTION public.gw_jps_norm();

DROP TRIGGER IF EXISTS trg_gw_jps_set_tenant ON public.gw_jukebox_playlist_shares;
CREATE TRIGGER trg_gw_jps_set_tenant
  BEFORE INSERT ON public.gw_jukebox_playlist_shares
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default();

-- Can the caller see this playlist? SECURITY DEFINER for the same reason as
-- user_has_tenant_role (2026-08-18): the policies below must never read a
-- table the caller is restricted from, and never their own table.
-- user_has_tenant_role is reused from that migration.
CREATE OR REPLACE FUNCTION public.gw_jukebox_playlist_visible(p_playlist uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT public.user_is_admin() OR EXISTS (
    SELECT 1 FROM public.gw_jukebox_playlist_shares s
     WHERE s.playlist_id = p_playlist
       AND s.tenant_id = public.current_tenant_id()
       AND s.revoked_at IS NULL
       AND (
         (s.share_type = 'email'
            AND lower(s.invited_email) = lower(auth.jwt() ->> 'email'))
         OR (s.share_type = 'role'
            AND public.user_has_tenant_role(s.target_role))
         OR (s.share_type = 'course' AND EXISTS (
               SELECT 1 FROM public.gw_course_enrollments e
                WHERE e.course_id = s.course_id
                  AND e.user_id = auth.uid()))
       )
  );
$$;

-- -------------------------------------------------------------------- RLS
ALTER TABLE public.gw_jukebox_tracks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_jukebox_playlists       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_jukebox_playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_jukebox_playlist_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_restrict ON public.gw_jukebox_tracks
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY tenant_isolation_restrict ON public.gw_jukebox_playlists
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY tenant_isolation_restrict ON public.gw_jukebox_playlist_shares
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
-- playlist_tracks has no tenant_id of its own; isolation rides the FK —
-- both parents are RESTRICTIVE-isolated, and every permissive policy below
-- goes through a parent row.

-- The library is for the whole workspace: every signed-in member reads the
-- track list (what's gated per-person is playlists, not songs — same stance
-- as the SoundCloud page, where "All tracks" was always on the rail).
CREATE POLICY jukebox_tracks_member_read ON public.gw_jukebox_tracks
  FOR SELECT TO authenticated
  USING (public.user_has_tenant_role('member'));
CREATE POLICY jukebox_tracks_admin_all ON public.gw_jukebox_tracks
  FOR ALL TO authenticated
  USING (public.user_is_admin())
  WITH CHECK (public.user_is_admin());

CREATE POLICY jukebox_playlists_admin_all ON public.gw_jukebox_playlists
  FOR ALL TO authenticated
  USING (public.user_is_admin())
  WITH CHECK (public.user_is_admin());
CREATE POLICY jukebox_playlists_grantee_read ON public.gw_jukebox_playlists
  FOR SELECT TO authenticated
  USING (public.gw_jukebox_playlist_visible(id));

CREATE POLICY jukebox_playlist_tracks_admin_all ON public.gw_jukebox_playlist_tracks
  FOR ALL TO authenticated
  USING (public.user_is_admin())
  WITH CHECK (public.user_is_admin());
CREATE POLICY jukebox_playlist_tracks_grantee_read ON public.gw_jukebox_playlist_tracks
  FOR SELECT TO authenticated
  USING (public.gw_jukebox_playlist_visible(playlist_id));

CREATE POLICY jps_admin_all ON public.gw_jukebox_playlist_shares
  FOR ALL TO authenticated
  USING (public.user_is_admin())
  WITH CHECK (public.user_is_admin());
-- A member reads only the shares that name them — they cannot list the
-- titles of playlists kept from them. Enforcement is here, not in the UI.
CREATE POLICY jps_grantee_read ON public.gw_jukebox_playlist_shares
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
             WHERE e.course_id = gw_jukebox_playlist_shares.course_id
               AND e.user_id = auth.uid()))
    )
  );

COMMENT ON TABLE public.gw_jukebox_tracks IS
  'Self-hosted audio library behind the Jukebox page (replaced the SoundCloud widget, 2026-10-05). Files live on the Spaces CDN; rows are tenant-scoped.';
COMMENT ON TABLE public.gw_jukebox_playlist_shares IS
  'Who sees which Jukebox playlist. No row = hidden from non-admins. Curation, not access control: the audio files are public CDN objects.';
