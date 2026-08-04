-- Publish-from-My-Music guardrails.
--
-- The publish mechanism itself already exists: a gw_sheet_music row with
-- storage_bucket='personal-scores' + storage_path=<object> makes that
-- private object readable to the row's tenant while the row exists, and
-- deleting the row revokes it (20260718140000_publish_private_scores.sql).
-- The Music Library UI now drives it (librarian/admin only — their INSERT
-- rights come from the existing "Librarians can insert sheet music"
-- policy). This migration adds two guardrails:

-- 1. One publish per tenant per object — double-publishing the same PDF
--    into a tenant's library creates confusing duplicate rows.
CREATE UNIQUE INDEX IF NOT EXISTS gw_sheet_music_personal_publish_uq
  ON public.gw_sheet_music (tenant_id, storage_path)
  WHERE storage_bucket = 'personal-scores';

-- 2. Privacy safeguard: the OWNER of a personal-scores object can always
--    unpublish it (delete the referencing row), even without librarian or
--    admin role — the path's first segment is the owner's uid by
--    construction (validated by the personal-scores storage policies).
--    Without this, only admins could delete (20251009114154) and a user
--    could lose control over tenant-wide access to their own file.
CREATE POLICY "owners revoke published personal scores"
  ON public.gw_sheet_music
  FOR DELETE
  TO authenticated
  USING (
    storage_bucket = 'personal-scores'
    AND split_part(storage_path, '/', 1) = auth.uid()::text
  );
