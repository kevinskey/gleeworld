
-- Fix RLS policy for gw_course_playlists to allow authenticated users to view public playlists
-- Drop the existing public policy that only applies to anon role
DROP POLICY IF EXISTS "Public playlists are viewable" ON public.gw_course_playlists;

-- Create new policy that allows both authenticated and public to view public playlists
CREATE POLICY "Public playlists viewable by all"
ON public.gw_course_playlists
FOR SELECT
TO public
USING (is_public = true);

-- Also update enrolled users policy to properly check enrollment status
DROP POLICY IF EXISTS "Enrolled users can view course playlists" ON public.gw_course_playlists;

CREATE POLICY "Enrolled users can view course playlists"
ON public.gw_course_playlists
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM gw_course_enrollments e
    WHERE e.course_id = gw_course_playlists.course_id
    AND e.user_id = auth.uid()
    AND e.enrollment_status = 'enrolled'
  )
);

-- Ensure members with active roles can view playlist media
DROP POLICY IF EXISTS "Members can view playlist media" ON public.gw_course_playlist_media;

CREATE POLICY "Authenticated users can view playlist media"
ON public.gw_course_playlist_media
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM gw_course_playlists p
    WHERE p.id = gw_course_playlist_media.playlist_id
    AND (
      p.is_public = true
      OR EXISTS (
        SELECT 1 FROM gw_course_enrollments e
        WHERE e.course_id = p.course_id
        AND e.user_id = auth.uid()
        AND e.enrollment_status = 'enrolled'
      )
    )
  )
);
