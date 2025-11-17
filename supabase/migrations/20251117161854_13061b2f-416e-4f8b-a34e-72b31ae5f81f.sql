-- Add missing columns to gw_assignments
ALTER TABLE gw_assignments 
ADD COLUMN IF NOT EXISTS instructions text,
ADD COLUMN IF NOT EXISTS rubric text;

-- Add missing columns to gw_courses
ALTER TABLE gw_courses 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Add missing columns to gw_grades
ALTER TABLE gw_grades 
ADD COLUMN IF NOT EXISTS feedback text,
ADD COLUMN IF NOT EXISTS released_to_student boolean DEFAULT true;