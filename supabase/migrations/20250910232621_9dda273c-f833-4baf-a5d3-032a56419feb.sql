-- Enable RLS on MUS 240 tables (one at a time to avoid deadlock)
ALTER TABLE public.mus240_project_groups ENABLE ROW LEVEL SECURITY;

-- Allow enrolled students to view groups
CREATE POLICY "mus240_groups_enrolled_students_read" 
ON public.mus240_project_groups 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.mus240_enrollments 
    WHERE student_id = auth.uid() 
    AND semester = 'Fall 2025' 
    AND enrollment_status = 'enrolled'
  ) OR 
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Allow enrolled students to create groups
CREATE POLICY "mus240_groups_enrolled_students_create" 
ON public.mus240_project_groups 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.mus240_enrollments 
    WHERE student_id = auth.uid() 
    AND semester = 'Fall 2025' 
    AND enrollment_status = 'enrolled'
  ) OR 
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Allow admins to manage all groups
CREATE POLICY "mus240_groups_admin_manage" 
ON public.mus240_project_groups 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);