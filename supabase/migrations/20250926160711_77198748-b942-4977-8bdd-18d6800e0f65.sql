-- Add missing excerpt_3 columns to mus240_midterm_submissions table
ALTER TABLE public.mus240_midterm_submissions 
ADD COLUMN IF NOT EXISTS excerpt_3_genre text,
ADD COLUMN IF NOT EXISTS excerpt_3_features text,
ADD COLUMN IF NOT EXISTS excerpt_3_context text;