-- Create junction table for course playlists with media library items
CREATE TABLE public.gw_course_playlist_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES public.gw_course_playlists(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES public.gw_media_library(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(playlist_id, media_id)
);

-- Enable RLS
ALTER TABLE public.gw_course_playlist_media ENABLE ROW LEVEL SECURITY;

-- Policies for instructors/admins
CREATE POLICY "Admins can manage playlist media" 
ON public.gw_course_playlist_media 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.app_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin', 'instructor')
    AND is_active = true
  )
);

CREATE POLICY "Members can view playlist media" 
ON public.gw_course_playlist_media 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.app_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

-- Create index for performance
CREATE INDEX idx_playlist_media_playlist ON public.gw_course_playlist_media(playlist_id);
CREATE INDEX idx_playlist_media_position ON public.gw_course_playlist_media(playlist_id, position);