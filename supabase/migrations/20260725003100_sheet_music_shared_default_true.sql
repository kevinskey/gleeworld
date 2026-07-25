-- Default new scores to shared_with_members = true so uploads land in
-- the Scores tab for every member on day one. Tenant admins can still
-- flip individual rows off via the share toggle in Music Library.
--
-- Before this change:
--   - `shared_with_members` had no server default → the many INSERT
--     paths across the codebase (BulkPDFUploader, PhysicalInventoryManager,
--     PDFImportManager, DocumentScanner, CSVImportExport, etc.) that
--     didn't set the column explicitly landed rows with NULL.
--   - MusicLibraryPage's non-admin query is `.eq('shared_with_members',
--     true)`, so NULL rows were invisible to members. Admins see them
--     (canEdit bypasses the filter), which is why the librarian's list
--     looked fine but no member could see the same scores.
--
-- Backfill only flips NULL → true. Rows explicitly toggled to false via
-- the share button in Music Library STAY false — a librarian who
-- deliberately unshared a copy-restricted score shouldn't have it
-- silently re-exposed by this migration.

ALTER TABLE public.gw_sheet_music
  ALTER COLUMN shared_with_members SET DEFAULT true;

UPDATE public.gw_sheet_music
   SET shared_with_members = true
 WHERE shared_with_members IS NULL;
