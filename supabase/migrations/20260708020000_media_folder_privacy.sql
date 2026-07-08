-- Media Library folder privacy. The blanket "Authenticated users can view
-- all media" (USING true) made EVERY tenant member see EVERY file, which
-- defeats per-user privacy for Studio exports (students would see each
-- other's takes). But fully dropping it would also hide class/platform
-- media students SHOULD see (only own/public/admin/shared remain).
--
-- Surgical fix: the blanket grant now applies only to UNFOLDERED items
-- (folder IS NULL — the existing shared library, unchanged). FOLDERED
-- items (Studio exports, future folders) fall through to the per-user
-- policies (owner / public / admin / explicit share), so they're private
-- and only reachable via an explicit gw_media_folder_shares grant.

DROP POLICY IF EXISTS "Authenticated users can view all media" ON public.gw_media_library;

CREATE POLICY "Authenticated users can view unfoldered media"
  ON public.gw_media_library
  FOR SELECT TO authenticated
  USING (folder IS NULL);
