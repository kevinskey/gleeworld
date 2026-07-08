-- Media Library folders. Adds a lightweight `folder` label to
-- gw_media_library so files can be grouped beyond the type filter
-- (Audio/Video/…). Studio region-exports land in folder 'Studio', under
-- each user's own path prefix (media/<userId>/studio/…), so per-user
-- subfolders fall out of file_path + the existing uploaded_by/tenant RLS.
--
-- NULL folder = the default/ungrouped library (all existing rows), so
-- nothing moves. Indexed for the folder-filtered list query.

ALTER TABLE public.gw_media_library
  ADD COLUMN IF NOT EXISTS folder text;

CREATE INDEX IF NOT EXISTS gw_media_library_folder_idx
  ON public.gw_media_library (folder)
  WHERE folder IS NOT NULL;
