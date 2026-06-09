-- Rollback Part Tracks ↔ Sheet Music FK
DROP INDEX IF EXISTS public.idx_gw_part_tracks_sheet_music;
ALTER TABLE public.gw_part_tracks DROP COLUMN IF EXISTS sheet_music_id;
