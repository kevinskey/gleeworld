-- Add course_id column to quick_capture_media for course-specific media
ALTER TABLE public.quick_capture_media 
ADD COLUMN course_id UUID REFERENCES public.glee_academy_courses(id) ON DELETE SET NULL;

-- Create index for efficient course-based queries
CREATE INDEX idx_quick_capture_media_course_id ON public.quick_capture_media(course_id);

-- Add comment for documentation
COMMENT ON COLUMN public.quick_capture_media.course_id IS 'Optional course association for course-specific media (Course Cam)';