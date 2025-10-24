-- Create table for MUS240 final project group updates
CREATE TABLE IF NOT EXISTS public.group_updates_mus240 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name TEXT NOT NULL,
  group_moderator TEXT NOT NULL,
  team_members TEXT NOT NULL,
  individual_contributions TEXT NOT NULL,
  thesis_statement TEXT NOT NULL,
  project_progress TEXT NOT NULL,
  source_links TEXT,
  final_product_description TEXT NOT NULL,
  final_product_link TEXT,
  challenges_faced TEXT,
  completion_plan TEXT NOT NULL,
  submitter_name TEXT NOT NULL,
  submitter_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.group_updates_mus240 ENABLE ROW LEVEL SECURITY;

-- Allow enrolled MUS240 students to view all updates
CREATE POLICY "MUS240 students can view all updates"
ON public.group_updates_mus240
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM mus240_enrollments
    WHERE student_id = auth.uid()
    AND semester = 'Fall 2025'
    AND enrollment_status = 'enrolled'
  )
);

-- Allow enrolled students to insert their own updates
CREATE POLICY "MUS240 students can submit updates"
ON public.group_updates_mus240
FOR INSERT
WITH CHECK (
  auth.uid() = submitter_id
  AND EXISTS (
    SELECT 1 FROM mus240_enrollments
    WHERE student_id = auth.uid()
    AND semester = 'Fall 2025'
    AND enrollment_status = 'enrolled'
  )
);

-- Allow students to update their own submissions
CREATE POLICY "Students can update their own submissions"
ON public.group_updates_mus240
FOR UPDATE
USING (auth.uid() = submitter_id);

-- Admins can view all
CREATE POLICY "Admins can view all updates"
ON public.group_updates_mus240
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Create updated_at trigger
CREATE TRIGGER update_group_updates_mus240_updated_at
BEFORE UPDATE ON public.group_updates_mus240
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();