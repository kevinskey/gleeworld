-- Revert 20260725003100_sheet_music_shared_default_true.sql
--
-- The previous migration flipped the default + backfilled NULL rows to
-- true so every upload appeared in the Scores tab for every member.
-- That was the wrong direction: uploads should stay private to the
-- uploader by default and only appear in Scores when explicitly shared.
--
-- This migration:
--   1. Sets the column default back to false so new inserts stay private
--   2. Flips every currently-visible row (`shared_with_members IS NOT
--      false`) back to false — including the rows the earlier migration
--      backfilled AND any that were true from the client belt-and-
--      suspenders path shipped earlier this hour. A tenant admin who
--      actually wanted a specific score shared can re-toggle it from
--      the Music Library share button; the goal here is a clean slate
--      so the Scores tab shows nothing until the librarian curates it.
--
-- If your tenant had a curated subset of scores flagged
-- shared_with_members = true that you want to preserve, take a snapshot
-- before applying this migration.

ALTER TABLE public.gw_sheet_music
  ALTER COLUMN shared_with_members SET DEFAULT false;

UPDATE public.gw_sheet_music
   SET shared_with_members = false
 WHERE shared_with_members IS DISTINCT FROM false;
