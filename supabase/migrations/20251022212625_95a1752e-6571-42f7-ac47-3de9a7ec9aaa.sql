-- Add peer review system for multi-level grading

-- Peer reviews table
CREATE TABLE IF NOT EXISTS public.mus240_peer_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journal_id UUID NOT NULL REFERENCES public.mus240_journal_entries(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(journal_id, reviewer_id)
);

-- Enable RLS
ALTER TABLE public.mus240_peer_reviews ENABLE ROW LEVEL SECURITY;

-- Policies for peer reviews
CREATE POLICY "Students can view peer reviews on their own journals"
  ON public.mus240_peer_reviews
  FOR SELECT
  USING (
    journal_id IN (
      SELECT id FROM public.mus240_journal_entries WHERE student_id = auth.uid()
    )
  );

CREATE POLICY "Students can view peer reviews they wrote"
  ON public.mus240_peer_reviews
  FOR SELECT
  USING (reviewer_id = auth.uid());

CREATE POLICY "Students can view peer reviews on published journals"
  ON public.mus240_peer_reviews
  FOR SELECT
  USING (
    journal_id IN (
      SELECT id FROM public.mus240_journal_entries WHERE is_published = true
    )
  );

CREATE POLICY "Students can create peer reviews on published journals"
  ON public.mus240_peer_reviews
  FOR INSERT
  WITH CHECK (
    reviewer_id = auth.uid() AND
    journal_id IN (
      SELECT id FROM public.mus240_journal_entries 
      WHERE is_published = true 
      AND student_id != auth.uid()
    )
  );

CREATE POLICY "Students can update their own peer reviews"
  ON public.mus240_peer_reviews
  FOR UPDATE
  USING (reviewer_id = auth.uid());

CREATE POLICY "Students can delete their own peer reviews"
  ON public.mus240_peer_reviews
  FOR DELETE
  USING (reviewer_id = auth.uid());

-- Create security definer function for admin check
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
$$;

CREATE POLICY "Admins can view all peer reviews"
  ON public.mus240_peer_reviews
  FOR SELECT
  USING (public.is_admin_user());

-- Update trigger for updated_at
CREATE TRIGGER update_mus240_peer_reviews_updated_at
  BEFORE UPDATE ON public.mus240_peer_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add instructor grade fields to journal grades table
ALTER TABLE public.mus240_journal_grades
  ADD COLUMN IF NOT EXISTS instructor_score NUMERIC,
  ADD COLUMN IF NOT EXISTS instructor_letter_grade TEXT,
  ADD COLUMN IF NOT EXISTS instructor_feedback TEXT,
  ADD COLUMN IF NOT EXISTS instructor_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS instructor_graded_at TIMESTAMP WITH TIME ZONE;

-- Rename existing feedback to ai_feedback for clarity
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'mus240_journal_grades' AND column_name = 'feedback'
  ) THEN
    ALTER TABLE public.mus240_journal_grades RENAME COLUMN feedback TO ai_feedback;
  END IF;
END $$;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_peer_reviews_journal_id ON public.mus240_peer_reviews(journal_id);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_reviewer_id ON public.mus240_peer_reviews(reviewer_id);