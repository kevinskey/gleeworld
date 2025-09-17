-- Fix error: BEFORE UPDATE trigger expects updated_at on mus240_grade_summaries
ALTER TABLE public.mus240_grade_summaries
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();