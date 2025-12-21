-- Add missing course fields for Banner/registrar data
ALTER TABLE public.gw_courses 
ADD COLUMN IF NOT EXISTS crn TEXT,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Add missing enrollment fields for Banner/registrar data  
ALTER TABLE public.gw_course_enrollments
ADD COLUMN IF NOT EXISTS credit_hours INTEGER DEFAULT 4,
ADD COLUMN IF NOT EXISTS registration_status TEXT DEFAULT 'Registered',
ADD COLUMN IF NOT EXISTS academic_level TEXT DEFAULT 'Undergraduate';

-- Add index on CRN for quick lookups
CREATE INDEX IF NOT EXISTS idx_gw_courses_crn ON public.gw_courses(crn);

-- Add index on student_id for matching during imports
CREATE INDEX IF NOT EXISTS idx_gw_profiles_student_id ON public.gw_profiles(student_id);