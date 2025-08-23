-- Clean up existing policies first
DROP POLICY IF EXISTS "study_scores_select_policy" ON public.gw_study_scores;
DROP POLICY IF EXISTS "study_scores_admin_manage_policy" ON public.gw_study_scores;
DROP POLICY IF EXISTS "users_can_create_study_scores" ON public.gw_study_scores;
DROP POLICY IF EXISTS "authenticated_users_can_view_study_scores" ON public.gw_study_scores;
DROP POLICY IF EXISTS "admins_can_manage_study_scores" ON public.gw_study_scores;

-- Drop any other existing policies that might cause recursion
DO $$ 
DECLARE 
  pol_name TEXT;
BEGIN
  FOR pol_name IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'gw_study_scores' 
    AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.gw_study_scores', pol_name);
  END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE public.gw_study_scores ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies using existing functions
CREATE POLICY "allow_all_authenticated_select_study_scores"
ON public.gw_study_scores
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "allow_admin_all_study_scores"
ON public.gw_study_scores
FOR ALL
TO authenticated
USING (check_user_admin_simple())
WITH CHECK (check_user_admin_simple());