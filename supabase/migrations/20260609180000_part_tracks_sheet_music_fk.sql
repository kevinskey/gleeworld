-- Part Tracks ↔ Sheet Music association
--
-- gw_part_tracks linked to gw_sheet_music by free-text title match, which
-- silently breaks on rename / typo and made the offline-download flow
-- ("grab the PDF + every part MP3 for this piece") impossible to query
-- reliably. Add a real foreign key.
--
-- Nullable on purpose: app-layer enforcement requires picking a piece on
-- the upload form, but existing/legacy rows (and any future scripted
-- inserts) can land with NULL and be triaged later via an admin view.
-- piece_title is kept as a denormalized display string for fast list
-- rendering — sheet_music_id is the truth.

ALTER TABLE public.gw_part_tracks
  ADD COLUMN IF NOT EXISTS sheet_music_id uuid
    REFERENCES public.gw_sheet_music(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_gw_part_tracks_sheet_music
  ON public.gw_part_tracks(sheet_music_id);

-- Drop the two test rows seeded during initial Part Tracks development
-- (piece_title = 'test', no matching sheet_music row, never linked to
-- real content). Confirmed 2026-06-09 against production: 2 rows, 1
-- distinct title 'test', 0 matches against gw_sheet_music.
DELETE FROM public.gw_part_tracks WHERE piece_title = 'test';
