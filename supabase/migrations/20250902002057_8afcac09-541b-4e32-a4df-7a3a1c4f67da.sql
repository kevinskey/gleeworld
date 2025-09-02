-- Fix the participation_points column constraint issue in mus240_grade_summaries
-- This allows the AI grading to work without requiring participation points

ALTER TABLE public.mus240_grade_summaries 
ALTER COLUMN participation_points DROP NOT NULL;

-- Set a default value of 0 for participation_points to prevent null issues
ALTER TABLE public.mus240_grade_summaries 
ALTER COLUMN participation_points SET DEFAULT 0;

-- Update any existing records that might have null participation_points
UPDATE public.mus240_grade_summaries 
SET participation_points = 0 
WHERE participation_points IS NULL;