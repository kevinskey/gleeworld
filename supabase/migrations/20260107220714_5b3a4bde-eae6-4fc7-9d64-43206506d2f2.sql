-- Add missing columns for academy course cards
ALTER TABLE public.glee_academy_courses
ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'All Levels',
ADD COLUMN IF NOT EXISTS duration TEXT DEFAULT '16 Weeks',
ADD COLUMN IF NOT EXISTS highlights TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS icon_name TEXT DEFAULT 'BookOpen',
ADD COLUMN IF NOT EXISTS route TEXT,
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Add instructor_hours as an alias if instructor_office_hours exists
-- (the existing column is instructor_office_hours, we'll use that)

-- Update existing courses with reasonable defaults
UPDATE public.glee_academy_courses SET 
  route = '/academy/' || LOWER(REPLACE(course_code, ' ', '-'))
WHERE route IS NULL;