-- Video library goes share-gated for tenants that want it (Kevin, 2026-10-05:
-- "I want to share videos from my collection but now everyone can see all my
-- videos").
--
-- youtube_videos is a PLATFORM table (3 tenants hold rows today, public
-- carousels read it anonymously on ~50 landing pages), so gating is opt-in
-- per row via a new `visibility` column that defaults to today's behavior:
--   public  — anyone, signed in or not (the launch default, unchanged)
--   members — any signed-in member of the tenant
--   shared  — only people reached through the EXISTING gw_video_shares
--             ledger (direct, via a course, via a group, or via a shared
--             playlist that contains the video), plus admins
-- Course-linked videos stay visible to enrollees regardless, so flipping a
-- tenant's library to 'shared' cannot break Academy course pages.

ALTER TABLE public.youtube_videos
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';

DO $$ BEGIN
  ALTER TABLE public.youtube_videos
    ADD CONSTRAINT youtube_videos_visibility_check
    CHECK (visibility IN ('public', 'members', 'shared'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- The share ledger is consulted per candidate row; these make that a pair of
-- index probes instead of seq scans.
CREATE INDEX IF NOT EXISTS gw_video_shares_resource_idx
  ON public.gw_video_shares (tenant_id, resource_type, resource_id);
CREATE INDEX IF NOT EXISTS gw_video_playlist_items_video_idx
  ON public.gw_video_playlist_items (video_id);

-- Can the caller see this 'shared'-visibility video? SECURITY DEFINER for
-- the same reason as gw_jukebox_playlist_visible: the youtube_videos policy
-- must not depend on the caller's read access to the ledger or playlists.
CREATE OR REPLACE FUNCTION public.gw_video_share_visible(p_video uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT public.user_is_admin() OR EXISTS (
    SELECT 1 FROM public.gw_video_shares s
     WHERE s.tenant_id = public.current_tenant_id()
       AND (
         (s.resource_type = 'video' AND s.resource_id = p_video)
         OR (s.resource_type = 'playlist' AND EXISTS (
               SELECT 1 FROM public.gw_video_playlist_items pi
                WHERE pi.playlist_id = s.resource_id
                  AND pi.video_id = p_video))
       )
       AND (
         s.shared_by = auth.uid()
         OR (s.recipient_type = 'user'
             AND s.recipient_id = auth.uid())
         OR (s.recipient_type = 'course' AND EXISTS (
               SELECT 1 FROM public.gw_course_enrollments e
                WHERE e.course_id = s.recipient_id
                  AND e.user_id = auth.uid()))
         OR (s.recipient_type = 'group' AND EXISTS (
               SELECT 1 FROM public.gw_group_members gm
                WHERE gm.group_id = s.recipient_id
                  AND gm.user_id = auth.uid()))
       )
  );
$$;

COMMENT ON FUNCTION public.gw_video_share_visible(uuid) IS
  'True when the caller is admin, the sharer, or reached by a live gw_video_shares row (direct / course / group / via shared playlist). Gates visibility=shared rows of youtube_videos and the video-stream-url presign function.';

-- ------------------------------------------------------------------ RLS
-- The launch-era blanket read is replaced by visibility-aware policies.
-- "Admins can manage youtube videos" (FOR ALL) is left in place.
DROP POLICY IF EXISTS "Everyone can view YouTube videos" ON public.youtube_videos;
DROP POLICY IF EXISTS video_public_read  ON public.youtube_videos;
DROP POLICY IF EXISTS video_members_read ON public.youtube_videos;
DROP POLICY IF EXISTS video_shared_read  ON public.youtube_videos;
DROP POLICY IF EXISTS video_course_read  ON public.youtube_videos;

CREATE POLICY video_public_read ON public.youtube_videos
  FOR SELECT TO public
  USING (visibility = 'public');

CREATE POLICY video_members_read ON public.youtube_videos
  FOR SELECT TO authenticated
  USING (visibility = 'members' AND public.user_has_tenant_role('member'));

CREATE POLICY video_shared_read ON public.youtube_videos
  FOR SELECT TO authenticated
  USING (visibility = 'shared' AND public.gw_video_share_visible(id));

-- Enrollment trumps visibility: a course video is part of the course.
CREATE POLICY video_course_read ON public.youtube_videos
  FOR SELECT TO authenticated
  USING (course_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.gw_course_enrollments e
     WHERE e.course_id = youtube_videos.course_id
       AND e.user_id = auth.uid()
  ));

COMMENT ON COLUMN public.youtube_videos.visibility IS
  'public (anyone, the default) | members (signed-in tenant members) | shared (only via gw_video_shares, see gw_video_share_visible)';
