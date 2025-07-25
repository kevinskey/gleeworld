-- Fix the infinite recursion issue in gw_profiles policies
-- First, drop ALL existing policies on gw_profiles
DO $$
DECLARE 
    policy_name TEXT;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'gw_profiles' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON public.gw_profiles';
    END LOOP;
END $$;

-- Disable and re-enable RLS to ensure clean state
ALTER TABLE public.gw_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_profiles ENABLE ROW LEVEL SECURITY;

-- Create completely new, non-recursive policies
CREATE POLICY "gw_profiles_select_all" ON public.gw_profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "gw_profiles_insert_own" ON public.gw_profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "gw_profiles_update_own" ON public.gw_profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Admin policy using profiles table (not gw_profiles) to avoid recursion
CREATE POLICY "gw_profiles_admin_all" ON public.gw_profiles
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'super-admin')
    )
  );