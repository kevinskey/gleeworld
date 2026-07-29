-- Studio + Part Tracks merge (2026-07-29). Part Tracks projects were
-- deleted 2026-07-29 with the platform owner's explicit approval; the
-- tables themselves are dropped here now that the editor is retired.

DROP TABLE IF EXISTS public.gw_part_tracks_recordings CASCADE;
DROP TABLE IF EXISTS public.gw_part_tracks_tracks CASCADE;
DROP TABLE IF EXISTS public.gw_part_tracks_projects CASCADE;

DELETE FROM gw_billing_modules WHERE id = 'part_tracks';
