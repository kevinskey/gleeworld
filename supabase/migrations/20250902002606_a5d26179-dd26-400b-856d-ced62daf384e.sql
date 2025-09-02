-- Fix the overall_percentage column constraint issue in mus240_grade_summaries
-- This allows the AI grading to work without requiring overall_percentage

ALTER TABLE public.mus240_grade_summaries 
ALTER COLUMN overall_percentage DROP NOT NULL;

-- Set a default value of 0 for overall_percentage to prevent null issues
ALTER TABLE public.mus240_grade_summaries 
ALTER COLUMN overall_percentage SET DEFAULT 0;

-- Update any existing records that might have null overall_percentage
UPDATE public.mus240_grade_summaries 
SET overall_percentage = 0 
WHERE overall_percentage IS NULL;