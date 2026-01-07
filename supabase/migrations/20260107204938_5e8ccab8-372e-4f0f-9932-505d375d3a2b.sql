-- Add course_id column to youtube_videos for course-specific video libraries
ALTER TABLE public.youtube_videos 
ADD COLUMN course_id uuid REFERENCES public.gw_courses(id) ON DELETE SET NULL;

-- Create index for faster course-based queries
CREATE INDEX idx_youtube_videos_course_id ON public.youtube_videos(course_id);

-- Add course_id to youtube_channels as well for course-specific channel assignments
ALTER TABLE public.youtube_channels 
ADD COLUMN course_id uuid REFERENCES public.gw_courses(id) ON DELETE SET NULL;

CREATE INDEX idx_youtube_channels_course_id ON public.youtube_channels(course_id);