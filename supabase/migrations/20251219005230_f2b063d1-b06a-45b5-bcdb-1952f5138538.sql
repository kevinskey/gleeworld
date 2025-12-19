-- Create course playlists table for linking courses to YouTube content
CREATE TABLE IF NOT EXISTS public.gw_course_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.gw_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  playlist_url TEXT, -- External YouTube playlist URL (optional)
  is_public BOOLEAN DEFAULT false, -- Show on public landing page
  is_featured BOOLEAN DEFAULT false, -- Feature in carousel
  display_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create junction table for curated video selections in playlists
CREATE TABLE IF NOT EXISTS public.gw_course_playlist_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID REFERENCES public.gw_course_playlists(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.youtube_videos(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  added_by UUID REFERENCES auth.users(id),
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(playlist_id, video_id)
);

-- Create featured videos table for public landing page carousel
CREATE TABLE IF NOT EXISTS public.gw_featured_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES public.youtube_videos(id) ON DELETE CASCADE,
  title_override TEXT, -- Optional custom title for carousel
  description_override TEXT, -- Optional custom description
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMPTZ, -- Optional scheduling
  end_date TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_course_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_course_playlist_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_featured_videos ENABLE ROW LEVEL SECURITY;

-- Public read for featured videos (for landing page carousel)
CREATE POLICY "Featured videos are publicly viewable"
ON public.gw_featured_videos FOR SELECT
USING (is_active = true AND (start_date IS NULL OR start_date <= now()) AND (end_date IS NULL OR end_date >= now()));

-- Public playlists are viewable by anyone
CREATE POLICY "Public playlists are viewable"
ON public.gw_course_playlists FOR SELECT
USING (is_public = true);

-- Authenticated users can view all playlists for courses they're enrolled in
CREATE POLICY "Enrolled users can view course playlists"
ON public.gw_course_playlists FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_course_enrollments e 
    WHERE e.course_id = gw_course_playlists.course_id 
    AND e.user_id = auth.uid()
  )
);

-- Admins and super admins can do everything
CREATE POLICY "Admins manage playlists"
ON public.gw_course_playlists FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p 
    WHERE p.user_id = auth.uid() 
    AND (p.is_admin = true OR p.is_super_admin = true)
  )
);

-- Course instructors can manage their course playlists
CREATE POLICY "Instructors manage their course playlists"
ON public.gw_course_playlists FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_course_enrollments e 
    WHERE e.course_id = gw_course_playlists.course_id 
    AND e.user_id = auth.uid() 
    AND e.role = 'instructor'
  )
);

-- Playlist videos follow playlist permissions
CREATE POLICY "View playlist videos"
ON public.gw_course_playlist_videos FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_course_playlists p 
    WHERE p.id = gw_course_playlist_videos.playlist_id
  )
);

-- Admins manage playlist videos
CREATE POLICY "Admins manage playlist videos"
ON public.gw_course_playlist_videos FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p 
    WHERE p.user_id = auth.uid() 
    AND (p.is_admin = true OR p.is_super_admin = true)
  )
);

-- Instructors manage playlist videos for their courses
CREATE POLICY "Instructors manage their playlist videos"
ON public.gw_course_playlist_videos FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_course_playlist_videos pv
    JOIN public.gw_course_playlists pl ON pl.id = pv.playlist_id
    JOIN public.gw_course_enrollments e ON e.course_id = pl.course_id
    WHERE e.user_id = auth.uid() AND e.role = 'instructor'
    AND pv.id = gw_course_playlist_videos.id
  )
);

-- Admins manage featured videos
CREATE POLICY "Admins manage featured videos"
ON public.gw_featured_videos FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p 
    WHERE p.user_id = auth.uid() 
    AND (p.is_admin = true OR p.is_super_admin = true)
  )
);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_gw_course_playlists_updated_at
BEFORE UPDATE ON public.gw_course_playlists
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gw_featured_videos_updated_at
BEFORE UPDATE ON public.gw_featured_videos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();