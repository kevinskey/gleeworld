-- Create table for course teaching assistants (if not exists)
CREATE TABLE IF NOT EXISTS public.course_teaching_assistants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_code TEXT NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, course_code)
);

-- Enable RLS
ALTER TABLE public.course_teaching_assistants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage all TAs" ON public.course_teaching_assistants;
DROP POLICY IF EXISTS "TAs can view their own assignments" ON public.course_teaching_assistants;
DROP POLICY IF EXISTS "TAs can view submissions for their courses" ON public.assignment_submissions;
DROP POLICY IF EXISTS "TAs can add feedback to submissions" ON public.assignment_submissions;

-- Create security definer function to check if user is TA for a course
CREATE OR REPLACE FUNCTION public.is_course_ta(_user_id UUID, _course_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.course_teaching_assistants
    WHERE user_id = _user_id
      AND course_code = _course_code
      AND is_active = true
  );
$$;

-- Create security definer function to check if current user is TA for a course
CREATE OR REPLACE FUNCTION public.current_user_is_course_ta(_course_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.course_teaching_assistants
    WHERE user_id = auth.uid()
      AND course_code = _course_code
      AND is_active = true
  );
$$;

-- RLS Policies for course_teaching_assistants
CREATE POLICY "Admins can manage all TAs"
ON public.course_teaching_assistants
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "TAs can view their own assignments"
ON public.course_teaching_assistants
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Update assignment_submissions RLS to allow TAs to view and give feedback (but not grade)
CREATE POLICY "TAs can view submissions for their courses"
ON public.assignment_submissions
FOR SELECT
TO authenticated
USING (
  current_user_is_course_ta('MUS240') OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "TAs can add feedback to submissions"
ON public.assignment_submissions
FOR UPDATE
TO authenticated
USING (
  current_user_is_course_ta('MUS240') AND
  grade IS NULL  -- TAs cannot modify grades
)
WITH CHECK (
  current_user_is_course_ta('MUS240') AND
  grade IS NULL  -- Ensure grade is not being set
);

-- Insert Genesis as TA for MUS 240
INSERT INTO public.course_teaching_assistants (user_id, course_code, assigned_by, notes)
SELECT 
  user_id,
  'MUS240',
  user_id,
  'Initial TA assignment - MUS 240'
FROM public.gw_profiles
WHERE email = 'genesisharris@spelman.edu'
ON CONFLICT (user_id, course_code) DO UPDATE
SET is_active = true, updated_at = now();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_course_tas_user_course 
ON public.course_teaching_assistants(user_id, course_code) 
WHERE is_active = true;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.update_course_tas_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_course_tas_updated_at ON public.course_teaching_assistants;
CREATE TRIGGER update_course_tas_updated_at
BEFORE UPDATE ON public.course_teaching_assistants
FOR EACH ROW
EXECUTE FUNCTION public.update_course_tas_updated_at();