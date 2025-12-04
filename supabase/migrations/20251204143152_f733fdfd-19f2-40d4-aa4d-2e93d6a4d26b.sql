-- Create table for executive board semester interviews/feedback
CREATE TABLE public.exec_board_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  semester VARCHAR(20) NOT NULL, -- e.g., "Fall 2024", "Spring 2025"
  position VARCHAR(100) NOT NULL,
  progress_summary TEXT NOT NULL,
  challenges_faced TEXT,
  projects_created TEXT,
  projects_participated TEXT,
  projects_completed TEXT,
  new_ideas TEXT,
  lessons_learned TEXT,
  recommendations_for_successor TEXT,
  additional_comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exec_board_interviews ENABLE ROW LEVEL SECURITY;

-- Users can view their own interviews
CREATE POLICY "Users can view own interviews"
ON public.exec_board_interviews
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own interviews
CREATE POLICY "Users can create own interviews"
ON public.exec_board_interviews
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own interviews
CREATE POLICY "Users can update own interviews"
ON public.exec_board_interviews
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins and super admins can view all interviews
CREATE POLICY "Admins can view all interviews"
ON public.exec_board_interviews
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create updated_at trigger
CREATE TRIGGER update_exec_board_interviews_updated_at
BEFORE UPDATE ON public.exec_board_interviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();