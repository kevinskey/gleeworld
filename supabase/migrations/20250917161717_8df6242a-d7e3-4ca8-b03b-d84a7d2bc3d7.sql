-- Enable RLS and create policies for MUS 240 project groups
-- This allows all enrolled students to freely manage groups

-- First, check if we need a function to verify MUS 240 enrollment
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

-- Create policies for mus240_project_groups table
DROP POLICY IF EXISTS "MUS 240 students can view all groups" ON public.mus240_project_groups;
DROP POLICY IF EXISTS "MUS 240 students can create groups" ON public.mus240_project_groups;
DROP POLICY IF EXISTS "MUS 240 students can update groups" ON public.mus240_project_groups;
DROP POLICY IF EXISTS "Admins can manage all groups" ON public.mus240_project_groups;

CREATE POLICY "MUS 240 students can view all groups"
ON public.mus240_project_groups
FOR SELECT
TO authenticated
USING (
  is_mus240_student(auth.uid()) OR 
  is_current_user_admin_safe()
);

CREATE POLICY "MUS 240 students can create groups"
ON public.mus240_project_groups
FOR INSERT
TO authenticated
WITH CHECK (
  is_mus240_student(auth.uid()) OR 
  is_current_user_admin_safe()
);

CREATE POLICY "MUS 240 students can update groups"
ON public.mus240_project_groups
FOR UPDATE
TO authenticated
USING (
  is_mus240_student(auth.uid()) OR 
  is_current_user_admin_safe()
)
WITH CHECK (
  is_mus240_student(auth.uid()) OR 
  is_current_user_admin_safe()
);

CREATE POLICY "Admins can delete groups"
ON public.mus240_project_groups
FOR DELETE
TO authenticated
USING (is_current_user_admin_safe());

-- Create policies for mus240_group_memberships table
DROP POLICY IF EXISTS "MUS 240 students can view memberships" ON public.mus240_group_memberships;
DROP POLICY IF EXISTS "MUS 240 students can join groups" ON public.mus240_group_memberships;
DROP POLICY IF EXISTS "MUS 240 students can leave groups" ON public.mus240_group_memberships;
DROP POLICY IF EXISTS "MUS 240 students can update memberships" ON public.mus240_group_memberships;

CREATE POLICY "MUS 240 students can view memberships"
ON public.mus240_group_memberships
FOR SELECT
TO authenticated
USING (
  is_mus240_student(auth.uid()) OR 
  is_current_user_admin_safe()
);

CREATE POLICY "MUS 240 students can join groups"
ON public.mus240_group_memberships
FOR INSERT
TO authenticated
WITH CHECK (
  (is_mus240_student(auth.uid()) AND member_id = auth.uid()) OR 
  is_current_user_admin_safe()
);

CREATE POLICY "MUS 240 students can leave groups"
ON public.mus240_group_memberships
FOR DELETE
TO authenticated
USING (
  (is_mus240_student(auth.uid()) AND member_id = auth.uid()) OR 
  is_current_user_admin_safe()
);

CREATE POLICY "MUS 240 students can update memberships"
ON public.mus240_group_memberships
FOR UPDATE
TO authenticated
USING (
  (is_mus240_student(auth.uid()) AND member_id = auth.uid()) OR 
  is_current_user_admin_safe()
)
WITH CHECK (
  (is_mus240_student(auth.uid()) AND member_id = auth.uid()) OR 
  is_current_user_admin_safe()
);

-- Create policies for group content tables (notes, links, sandboxes)
-- mus240_group_notes
DROP POLICY IF EXISTS "Group members can manage notes" ON public.mus240_group_notes;
CREATE POLICY "Group members can manage notes"
ON public.mus240_group_notes
FOR ALL
TO authenticated
USING (
  is_mus240_student(auth.uid()) OR 
  is_current_user_admin_safe()
)
WITH CHECK (
  is_mus240_student(auth.uid()) OR 
  is_current_user_admin_safe()
);

-- mus240_group_links
DROP POLICY IF EXISTS "Group members can manage links" ON public.mus240_group_links;
CREATE POLICY "Group members can manage links"
ON public.mus240_group_links
FOR ALL
TO authenticated
USING (
  is_mus240_student(auth.uid()) OR 
  is_current_user_admin_safe()
)
WITH CHECK (
  is_mus240_student(auth.uid()) OR 
  is_current_user_admin_safe()
);

-- mus240_group_sandboxes
DROP POLICY IF EXISTS "Group members can manage sandboxes" ON public.mus240_group_sandboxes;
CREATE POLICY "Group members can manage sandboxes"
ON public.mus240_group_sandboxes
FOR ALL
TO authenticated
USING (
  is_mus240_student(auth.uid()) OR 
  is_current_user_admin_safe()
)
WITH CHECK (
  is_mus240_student(auth.uid()) OR 
  is_current_user_admin_safe()
);