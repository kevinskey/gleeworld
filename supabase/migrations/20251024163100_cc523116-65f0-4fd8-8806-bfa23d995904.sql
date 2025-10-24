-- Create table for individual member contributions to group updates
CREATE TABLE IF NOT EXISTS public.group_update_member_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_update_id UUID REFERENCES public.group_updates_mus240(id) ON DELETE CASCADE,
  member_id UUID REFERENCES auth.users(id),
  member_name TEXT NOT NULL,
  contribution TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_update_id, member_id)
);

-- Enable RLS
ALTER TABLE public.group_update_member_contributions ENABLE ROW LEVEL SECURITY;

-- Allow enrolled students to view contributions for their group updates
CREATE POLICY "Students can view contributions"
ON public.group_update_member_contributions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM mus240_enrollments
    WHERE student_id = auth.uid()
    AND semester = 'Fall 2025'
    AND enrollment_status = 'enrolled'
  )
  OR EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Allow students to insert their own contributions
CREATE POLICY "Students can insert their own contributions"
ON public.group_update_member_contributions
FOR INSERT
WITH CHECK (
  auth.uid() = member_id
  AND EXISTS (
    SELECT 1 FROM mus240_enrollments
    WHERE student_id = auth.uid()
    AND semester = 'Fall 2025'
    AND enrollment_status = 'enrolled'
  )
);

-- Allow students to update only their own contributions
CREATE POLICY "Students can update their own contributions"
ON public.group_update_member_contributions
FOR UPDATE
USING (auth.uid() = member_id);

-- Allow students to delete their own contributions
CREATE POLICY "Students can delete their own contributions"
ON public.group_update_member_contributions
FOR DELETE
USING (auth.uid() = member_id);

-- Create updated_at trigger
CREATE TRIGGER update_member_contributions_updated_at
BEFORE UPDATE ON public.group_update_member_contributions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();