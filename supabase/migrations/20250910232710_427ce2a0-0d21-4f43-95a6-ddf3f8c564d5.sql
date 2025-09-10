-- Enable RLS on remaining MUS 240 tables
ALTER TABLE public.mus240_group_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mus240_group_memberships ENABLE ROW LEVEL SECURITY;

-- Allow enrolled students to view applications
CREATE POLICY "mus240_applications_enrolled_students_read" 
ON public.mus240_group_applications 
FOR SELECT 
USING (
  applicant_id = auth.uid() OR
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

-- Allow enrolled students to create applications
CREATE POLICY "mus240_applications_enrolled_students_create" 
ON public.mus240_group_applications 
FOR INSERT 
WITH CHECK (
  applicant_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.mus240_enrollments 
    WHERE student_id = auth.uid() 
    AND semester = 'Fall 2025' 
    AND enrollment_status = 'enrolled'
  )
);

-- Allow students to update their own applications
CREATE POLICY "mus240_applications_own_update" 
ON public.mus240_group_applications 
FOR UPDATE 
USING (applicant_id = auth.uid());

-- Allow admins to manage all applications
CREATE POLICY "mus240_applications_admin_manage" 
ON public.mus240_group_applications 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Allow enrolled students to view group memberships
CREATE POLICY "mus240_memberships_enrolled_students_read" 
ON public.mus240_group_memberships 
FOR SELECT 
USING (
  member_id = auth.uid() OR
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

-- Allow system to create memberships (for accepted applications)
CREATE POLICY "mus240_memberships_system_create" 
ON public.mus240_group_memberships 
FOR INSERT 
WITH CHECK (true);

-- Allow admins and group leaders to manage memberships
CREATE POLICY "mus240_memberships_admin_manage" 
ON public.mus240_group_memberships 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  ) OR
  EXISTS (
    SELECT 1 FROM public.mus240_project_groups 
    WHERE id = mus240_group_memberships.group_id 
    AND leader_id = auth.uid()
  )
);