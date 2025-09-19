-- Clean up duplicate and conflicting RLS policies for mus240_group_memberships
-- Keep only the essential policies that work correctly

-- Drop duplicate INSERT policies, keeping only the working ones
DROP POLICY IF EXISTS "Students can join groups" ON public.mus240_group_memberships;
DROP POLICY IF EXISTS "Users can join groups (self-insert)" ON public.mus240_group_memberships;
DROP POLICY IF EXISTS "mus240_memberships_system_create" ON public.mus240_group_memberships;

-- Drop duplicate SELECT policies, keeping only the working ones  
DROP POLICY IF EXISTS "Authenticated users can view MUS240 memberships" ON public.mus240_group_memberships;
DROP POLICY IF EXISTS "Students can view all group memberships" ON public.mus240_group_memberships;
DROP POLICY IF EXISTS "Students can view memberships for their groups" ON public.mus240_group_memberships;
DROP POLICY IF EXISTS "System can manage memberships" ON public.mus240_group_memberships;

-- Drop duplicate DELETE policies, keeping only the working ones
DROP POLICY IF EXISTS "Students can leave groups or leaders can manage memberships" ON public.mus240_group_memberships;
DROP POLICY IF EXISTS "Users can leave their groups (self-delete)" ON public.mus240_group_memberships;

-- Keep the most permissive and working policies
-- This one allows MUS240 students to join groups
CREATE POLICY "mus240_students_can_join_groups" 
ON public.mus240_group_memberships 
FOR INSERT 
TO authenticated
WITH CHECK (
  (is_mus240_student(auth.uid()) AND member_id = auth.uid()) 
  OR is_current_user_admin_safe()
);

-- This one allows students to view memberships
CREATE POLICY "mus240_students_can_view_memberships" 
ON public.mus240_group_memberships 
FOR SELECT 
TO authenticated
USING (
  is_mus240_student(auth.uid()) 
  OR is_current_user_admin_safe()
  OR member_id = auth.uid()
);

-- This one allows students to leave groups
CREATE POLICY "mus240_students_can_leave_groups" 
ON public.mus240_group_memberships 
FOR DELETE 
TO authenticated
USING (
  (is_mus240_student(auth.uid()) AND member_id = auth.uid()) 
  OR is_current_user_admin_safe()
  OR (EXISTS ( 
    SELECT 1 FROM mus240_project_groups 
    WHERE id = mus240_group_memberships.group_id 
    AND leader_id = auth.uid()
  ))
);

-- Test the is_mus240_student function to make sure it works
DO $$
DECLARE
    test_result BOOLEAN;
    sample_user_id UUID;
BEGIN
    -- Get a sample user from enrollments
    SELECT student_id INTO sample_user_id 
    FROM mus240_enrollments 
    WHERE enrollment_status = 'enrolled' 
    AND semester = 'Fall 2025' 
    LIMIT 1;
    
    IF sample_user_id IS NOT NULL THEN
        -- Test the function
        SELECT is_mus240_student(sample_user_id) INTO test_result;
        RAISE NOTICE 'Testing is_mus240_student function with user %: %', sample_user_id, test_result;
    ELSE
        RAISE NOTICE 'No enrolled students found for testing';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error testing is_mus240_student function: %', SQLERRM;
END $$;