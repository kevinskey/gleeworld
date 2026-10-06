-- Public playlists for the website's Yo Player block (Kevin, 2026-10-06:
-- "soundcloud should be replaced with yo player on the public website").
--
-- A playlist marked is_public streams to ANONYMOUS visitors of the tenant's
-- public site — the same exposure the SoundCloud block it replaces had,
-- which played the tenant's public SoundCloud profile to anyone. The
-- gw_jukebox_playlist_shares ledger keeps gating members; is_public is a
-- separate, deliberate "this goes on the website" switch flipped from the
-- Yo Player block's editor. Streaming still rides jukebox-track-url, which
-- checks the caller's RLS view — so anon playback works via these policies
-- with no function change.

ALTER TABLE public.gw_jukebox_playlists
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.gw_jukebox_playlists.is_public IS
  'Streams to anonymous visitors via the public-site Yo Player block. Member visibility stays on gw_jukebox_playlist_shares.';

-- Members and admins also see public playlists inside Yo Player — a set on
-- the website but invisible in the app would read as a bug.
CREATE OR REPLACE FUNCTION public.gw_jukebox_playlist_visible(p_playlist uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT public.user_is_admin()
  OR EXISTS (
    SELECT 1 FROM public.gw_jukebox_playlists pl
     WHERE pl.id = p_playlist
       AND pl.is_public
       AND pl.tenant_id = public.current_tenant_id()
  )
  OR EXISTS (
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

-- Anonymous read of public playlists, their membership rows, and the tracks
-- inside them. These tables had NO anon policies before, so anon still sees
-- nothing until a playlist is explicitly flipped public. Tenant scoping is
-- in each policy (anon_tenant_id()) because the launch migration's
-- RESTRICTIVE tenant isolation on these tables binds `authenticated` only.
DROP POLICY IF EXISTS jukebox_playlists_public_read       ON public.gw_jukebox_playlists;
DROP POLICY IF EXISTS jukebox_playlist_tracks_public_read ON public.gw_jukebox_playlist_tracks;
DROP POLICY IF EXISTS jukebox_tracks_public_read          ON public.gw_jukebox_tracks;

CREATE POLICY jukebox_playlists_public_read ON public.gw_jukebox_playlists
  FOR SELECT TO anon
  USING (is_public AND tenant_id = public.anon_tenant_id());

CREATE POLICY jukebox_playlist_tracks_public_read ON public.gw_jukebox_playlist_tracks
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.gw_jukebox_playlists pl
     WHERE pl.id = gw_jukebox_playlist_tracks.playlist_id
       AND pl.is_public
       AND pl.tenant_id = public.anon_tenant_id()
  ));

CREATE POLICY jukebox_tracks_public_read ON public.gw_jukebox_tracks
  FOR SELECT TO anon
  USING (
    tenant_id = public.anon_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.gw_jukebox_playlist_tracks pt
      JOIN public.gw_jukebox_playlists pl ON pl.id = pt.playlist_id
     WHERE pt.track_id = gw_jukebox_tracks.id
       AND pl.is_public
  ));
