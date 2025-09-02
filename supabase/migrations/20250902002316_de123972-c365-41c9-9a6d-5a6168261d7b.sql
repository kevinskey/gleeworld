-- Fix the overall_points column constraint issue in mus240_grade_summaries
-- This allows the AI grading to work without requiring overall_points

ALTER TABLE public.mus240_grade_summaries 
ALTER COLUMN overall_points DROP NOT NULL;

-- Set a default value of 0 for overall_points to prevent null issues
ALTER TABLE public.mus240_grade_summaries 
ALTER COLUMN overall_points SET DEFAULT 0;

-- Update any existing records that might have null overall_points
UPDATE public.mus240_grade_summaries 
SET overall_points = 0 
WHERE overall_points IS NULL;