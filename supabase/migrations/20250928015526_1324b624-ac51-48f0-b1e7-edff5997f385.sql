-- Add comprehensive feedback columns to mus240_midterm_submissions table
ALTER TABLE public.mus240_midterm_submissions 
ADD COLUMN IF NOT EXISTS comprehensive_feedback TEXT,
ADD COLUMN IF NOT EXISTS feedback_generated_at TIMESTAMP WITH TIME ZONE;