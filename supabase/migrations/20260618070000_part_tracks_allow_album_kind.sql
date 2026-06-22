-- 2026-06-18 — Part Tracks: allow 'apple_music_album' as an
-- accompaniment kind so the studio can store a whole album as the
-- backing source (setQueue({ album }) instead of { song }).
-- Without this the picker's album-tap mutation silently fails the
-- CHECK constraint and the choice never persists.

ALTER TABLE gw_part_tracks_projects
  DROP CONSTRAINT IF EXISTS gw_part_tracks_projects_accompaniment_kind_check;

ALTER TABLE gw_part_tracks_projects
  ADD CONSTRAINT gw_part_tracks_projects_accompaniment_kind_check
  CHECK (accompaniment_kind = ANY (ARRAY[
    'file'::text,
    'apple_music'::text,
    'apple_music_album'::text,
    'youtube'::text
  ]));
