-- Temporarily disable RLS on gw_profiles to fix the recursion issue
ALTER TABLE public.gw_profiles DISABLE ROW LEVEL SECURITY;

-- Drop all policies and triggers that might cause recursion
DROP POLICY IF EXISTS "Users can view their own profile" ON public.gw_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.gw_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.gw_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.gw_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.gw_profiles;

-- Check if there are any other policies
-- Re-enable RLS with simple, non-recursive policies
ALTER TABLE public.gw_profiles ENABLE ROW LEVEL SECURITY;

-- Create simple policies that don't cause recursion
CREATE POLICY "Allow all authenticated users to read gw_profiles" ON public.gw_profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own gw_profile" ON public.gw_profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own gw_profile" ON public.gw_profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Admins can do everything (using profiles table to avoid recursion)
CREATE POLICY "Admins can manage all gw_profiles" ON public.gw_profiles
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
    )
  );