-- Jukebox tracks: visible only through a shared playlist.
--
-- The launch policy (20261005090000) let every signed-in member read the
-- whole track table, matching the old SoundCloud page where "All tracks"
-- was always on the rail. Kevin reversed that same day: members should see
-- ONLY what has been shared with them. A track is now readable by a
-- non-admin exactly when it sits in at least one playlist whose shares name
-- them; everything else is admin-only.
--
-- The page needs no query change — "All songs" simply returns the caller's
-- shared universe. Note the files themselves stay public CDN objects; like
-- the share rows, this is page curation, not file access control.

DROP POLICY IF EXISTS jukebox_tracks_member_read ON public.gw_jukebox_tracks;

CREATE POLICY jukebox_tracks_shared_read ON public.gw_jukebox_tracks
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.gw_jukebox_playlist_tracks pt
     WHERE pt.track_id = gw_jukebox_tracks.id
       AND public.gw_jukebox_playlist_visible(pt.playlist_id)
  ));

-- The policy probes playlist_tracks by track id on every row; without this
-- index that's a seq scan per track.
CREATE INDEX IF NOT EXISTS gw_jukebox_playlist_tracks_track_idx
  ON public.gw_jukebox_playlist_tracks (track_id);
