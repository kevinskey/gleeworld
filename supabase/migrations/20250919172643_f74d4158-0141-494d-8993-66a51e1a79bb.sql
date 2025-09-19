-- Fix infinite recursion in mus240_project_groups RLS policies
-- First, create a security definer function to check if user is a MUS240 student
CREATE OR REPLACE FUNCTION public.is_mus240_student(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mus240_enrollments
    WHERE student_id = user_id_param 
    AND enrollment_status = 'enrolled' 
    AND semester = 'Fall 2025'
  );
$$;

-- Drop all existing policies on mus240_project_groups to prevent conflicts
DROP POLICY IF EXISTS "Students can view groups for their semester" ON public.mus240_project_groups;
DROP POLICY IF EXISTS "MUS240 students can view project groups" ON public.mus240_project_groups;
DROP POLICY IF EXISTS "Admins can manage all groups" ON public.mus240_project_groups;
DROP POLICY IF EXISTS "mus240_project_groups_admin_all" ON public.mus240_project_groups;
DROP POLICY IF EXISTS "mus240_project_groups_select" ON public.mus240_project_groups;
DROP POLICY IF EXISTS "mus240_project_groups_insert" ON public.mus240_project_groups;
DROP POLICY IF EXISTS "mus240_project_groups_update" ON public.mus240_project_groups;
DROP POLICY IF EXISTS "mus240_project_groups_delete" ON public.mus240_project_groups;

-- Create new, clean policies using the security definer function
CREATE POLICY "mus240_groups_select" 
ON public.mus240_project_groups 
FOR SELECT 
USING (is_mus240_student(auth.uid()) OR is_current_user_admin_safe());

CREATE POLICY "mus240_groups_insert" 
ON public.mus240_project_groups 
FOR INSERT 
WITH CHECK (is_mus240_student(auth.uid()) OR is_current_user_admin_safe());

CREATE POLICY "mus240_groups_update" 
ON public.mus240_project_groups 
FOR UPDATE 
USING (is_mus240_student(auth.uid()) OR is_current_user_admin_safe())
WITH CHECK (is_mus240_student(auth.uid()) OR is_current_user_admin_safe());

CREATE POLICY "mus240_groups_delete" 
ON public.mus240_project_groups 
FOR DELETE 
USING (is_current_user_admin_safe());

-- Also fix the mus240_group_memberships policies to prevent similar issues
DROP POLICY IF EXISTS "Students can manage their own memberships" ON public.mus240_group_memberships;
DROP POLICY IF EXISTS "MUS240 students can manage group memberships" ON public.mus240_group_memberships;
DROP POLICY IF EXISTS "mus240_memberships_select" ON public.mus240_group_memberships;
DROP POLICY IF EXISTS "mus240_memberships_insert" ON public.mus240_group_memberships;
DROP POLICY IF EXISTS "mus240_memberships_update" ON public.mus240_group_memberships;
DROP POLICY IF EXISTS "mus240_memberships_delete" ON public.mus240_group_memberships;

-- Create clean membership policies
CREATE POLICY "mus240_memberships_select" 
ON public.mus240_group_memberships 
FOR SELECT 
USING (is_mus240_student(auth.uid()) OR is_current_user_admin_safe());

CREATE POLICY "mus240_memberships_insert" 
ON public.mus240_group_memberships 
FOR INSERT 
WITH CHECK (
  (is_mus240_student(auth.uid()) AND member_id = auth.uid()) 
  OR is_current_user_admin_safe()
);

CREATE POLICY "mus240_memberships_update" 
ON public.mus240_group_memberships 
FOR UPDATE 
USING (
  (is_mus240_student(auth.uid()) AND member_id = auth.uid()) 
  OR is_current_user_admin_safe()
)
WITH CHECK (
  (is_mus240_student(auth.uid()) AND member_id = auth.uid()) 
  OR is_current_user_admin_safe()
);

CREATE POLICY "mus240_memberships_delete" 
ON public.mus240_group_memberships 
FOR DELETE 
USING (
  (is_mus240_student(auth.uid()) AND member_id = auth.uid()) 
  OR is_current_user_admin_safe()
);