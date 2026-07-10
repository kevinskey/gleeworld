-- Part Tracks: the score link is now OPTIONAL. Projects can be a
-- backing track + recorded voices with no PDF at all (a cappella /
-- by-ear work). The create dialog offers score and backing track as
-- independent optional steps; only the project title is required.
-- The FK + ON DELETE CASCADE stay — NULL rows are simply unaffected
-- when a score is deleted.
ALTER TABLE public.gw_part_tracks_projects
  ALTER COLUMN sheet_music_id DROP NOT NULL;
