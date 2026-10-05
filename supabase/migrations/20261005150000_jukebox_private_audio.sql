-- Jukebox goes private (2026-10-05, same day as launch): the Spaces bucket
-- (kpj-mp3s/soundcloud-backup/) is no longer public-read, and the library is
-- no longer workspace-wide. A member sees — and can stream — only tracks that
-- reach them through a playlist share. Admins keep the full library.
--
-- Streaming is enforced twice: this policy decides which rows a member can
-- read, and the jukebox-track-url edge function re-runs the same check (by
-- selecting the track AS the caller) before minting a presigned GET. The raw
-- audio_url in the row is a dead link without that signature.

-- Can the caller see this track at all? A track is visible iff it belongs to
-- at least one playlist the caller can see. SECURITY DEFINER for the same
-- reason as gw_jukebox_playlist_visible: the tracks policy must not depend on
-- the caller's read access to playlist_tracks.
CREATE OR REPLACE FUNCTION public.gw_jukebox_track_visible(p_track uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT public.user_is_admin() OR EXISTS (
    SELECT 1 FROM public.gw_jukebox_playlist_tracks pt
     WHERE pt.track_id = p_track
       AND public.gw_jukebox_playlist_visible(pt.playlist_id)
  );
$$;

-- Replaces the launch-day "library is for the whole workspace" stance.
DROP POLICY IF EXISTS jukebox_tracks_member_read ON public.gw_jukebox_tracks;
DROP POLICY IF EXISTS jukebox_tracks_grantee_read ON public.gw_jukebox_tracks;
CREATE POLICY jukebox_tracks_grantee_read ON public.gw_jukebox_tracks
  FOR SELECT TO authenticated
  USING (public.gw_jukebox_track_visible(id));

COMMENT ON FUNCTION public.gw_jukebox_track_visible(uuid) IS
  'True when the caller is admin or the track is in a playlist shared with them. Gates both the gw_jukebox_tracks read policy and the jukebox-track-url presign function.';
