-- Add `songwriting` to is_sensitive_bucket().
--
-- Companion to 20260808300000, which closed the same class of hole for studio,
-- studio-video and parttrack. songwriting was deliberately held back then,
-- because its per-bucket policy is owner-only and tightening it might have
-- broken playback of a SHARED song's recordings — gw_songs has a visibility
-- column and 6 songs are set to 'tenant'.
--
-- That concern is now resolved by measurement, not argument. gw_song_recordings
-- carries only one permissive policy, `song_recordings_owner` = (user_id =
-- uid()), and no policy grants anyone else access — not even for a shared song.
-- Verified live as a non-admin tenant-mate of the recordings' owner:
--
--   others' recording ROWS visible:  0   <- metadata already owner-only
--   others' recording FILES visible: 5   <- the gap
--
-- So a tenant-mate cannot discover another member's storage_path through the
-- application at all; the bucket grant is excess reach that no feature uses.
-- Shared-song recording playback does not exist to break.
--
-- After this, storage_auth_select falls through to owner = uid(), matching
-- songwriting_bucket_owner_read, which already required
-- (foldername[1] = current_tenant_id() AND owner = uid()).
--
-- Safe to re-run: CREATE OR REPLACE.

CREATE OR REPLACE FUNCTION public.is_sensitive_bucket(p_bucket_id text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT p_bucket_id IN (
    'w9-forms', 'id-documents', 'signed-contracts', 'contract-documents',
    'contract-signatures', 'tour-contracts', 'budget-documents', 'receipts',
    'excuse-documents', 'executive-board-files', 'hair-nail-photos',
    'performer-documents', 'personal-scores',
    'studio', 'studio-video', 'parttrack',
    -- Added 2026-08-08. Personal songwriting takes. The metadata table is
    -- already owner-only; this stops the audio itself being readable by
    -- anyone in the tenant holding a path.
    'songwriting'
  )
$function$;
