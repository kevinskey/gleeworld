-- Clean up all duplicate and conflicting policies for mus240 tables
-- Drop ALL existing policies for both tables first
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all policies on mus240_project_groups
    FOR policy_record IN
        SELECT policyname FROM pg_policies 
        WHERE tablename = 'mus240_project_groups' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.mus240_project_groups', policy_record.policyname);
    END LOOP;
    
    -- Drop all policies on mus240_group_memberships
    FOR policy_record IN
        SELECT policyname FROM pg_policies 
        WHERE tablename = 'mus240_group_memberships' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.mus240_group_memberships', policy_record.policyname);
    END LOOP;
END
$$;

-- Create clean, simple policies for mus240_project_groups
CREATE POLICY "groups_read" 
ON public.mus240_project_groups 
FOR SELECT 
TO authenticated
USING (
  is_mus240_student(auth.uid()) OR 
  is_current_user_admin_safe()
);

CREATE POLICY "groups_write" 
ON public.mus240_project_groups 
FOR INSERT 
TO authenticated
WITH CHECK (
  is_mus240_student(auth.uid()) OR 
  is_current_user_admin_safe()
);

CREATE POLICY "groups_modify" 
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

CREATE POLICY "groups_remove" 
ON public.mus240_project_groups 
FOR DELETE 
TO authenticated
USING (
  is_current_user_admin_safe()
);

-- Create clean, simple policies for mus240_group_memberships  
CREATE POLICY "memberships_read" 
ON public.mus240_group_memberships 
FOR SELECT 
TO authenticated
USING (
  is_mus240_student(auth.uid()) OR 
  is_current_user_admin_safe()
);

CREATE POLICY "memberships_write" 
ON public.mus240_group_memberships 
FOR INSERT 
TO authenticated
WITH CHECK (
  (is_mus240_student(auth.uid()) AND member_id = auth.uid()) OR 
  is_current_user_admin_safe()
);

CREATE POLICY "memberships_modify" 
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

CREATE POLICY "memberships_remove" 
ON public.mus240_group_memberships 
FOR DELETE 
TO authenticated
USING (
  (is_mus240_student(auth.uid()) AND member_id = auth.uid()) OR 
  is_current_user_admin_safe()
);