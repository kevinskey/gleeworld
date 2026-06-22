-- Per-score page arrangement. A null (or identity) page_order means "play
-- the PDF straight through"; otherwise page_order[i] is the physical
-- page to render at logical position i (1-indexed). Allows reorder,
-- duplicate (repeat a physical page), and skip (delete a logical entry)
-- without rewriting the PDF on storage.
--
-- Bookmarks / jumps / annotations stay tied to the PHYSICAL page so the
-- user's marks survive arrangement changes.

ALTER TABLE public.gw_sheet_music
  ADD COLUMN IF NOT EXISTS page_order INTEGER[];

COMMENT ON COLUMN public.gw_sheet_music.page_order IS
  'Logical → physical page mapping (1-indexed). NULL means identity (1,2,3,…N). Used by Viewer reader; does NOT rewrite the underlying PDF.';
