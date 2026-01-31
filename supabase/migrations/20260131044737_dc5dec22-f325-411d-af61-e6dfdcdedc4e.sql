-- Add course_id column to gw_sight_reading_assignments for proper course filtering
ALTER TABLE public.gw_sight_reading_assignments 
ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.gw_courses(id);

-- Create index for faster course lookups
CREATE INDEX IF NOT EXISTS idx_sight_reading_course_id ON public.gw_sight_reading_assignments(course_id);

-- Update existing MUS 070 sight-reading assignments to link to MUS 070 course
-- MUS 070 course ID from gw_courses
UPDATE public.gw_sight_reading_assignments
SET course_id = (SELECT id FROM public.gw_courses WHERE course_code = 'MUS 070' LIMIT 1)
WHERE course_id IS NULL;