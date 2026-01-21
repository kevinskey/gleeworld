-- Create table to track student resource completion
CREATE TABLE IF NOT EXISTS public.mus240_student_resource_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL,
  module_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now(),
  time_spent_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, resource_id)
);

-- Enable RLS
ALTER TABLE public.mus240_student_resource_progress ENABLE ROW LEVEL SECURITY;

-- Students can view their own progress
CREATE POLICY "Students can view own progress"
  ON public.mus240_student_resource_progress
  FOR SELECT
  USING (auth.uid() = student_id);

-- Students can mark resources as complete
CREATE POLICY "Students can mark resources complete"
  ON public.mus240_student_resource_progress
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Students can update their own progress
CREATE POLICY "Students can update own progress"
  ON public.mus240_student_resource_progress
  FOR UPDATE
  USING (auth.uid() = student_id);

-- Students can remove completion
CREATE POLICY "Students can delete own progress"
  ON public.mus240_student_resource_progress
  FOR DELETE
  USING (auth.uid() = student_id);

-- Instructors/admins can view all progress
CREATE POLICY "Admins can view all progress"
  ON public.mus240_student_resource_progress
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE user_id = auth.uid() 
      AND (role IN ('admin', 'super_admin') OR is_admin = true)
    )
  );

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_mus240_progress_student ON public.mus240_student_resource_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_mus240_progress_resource ON public.mus240_student_resource_progress(resource_id);
CREATE INDEX IF NOT EXISTS idx_mus240_progress_module ON public.mus240_student_resource_progress(module_id);