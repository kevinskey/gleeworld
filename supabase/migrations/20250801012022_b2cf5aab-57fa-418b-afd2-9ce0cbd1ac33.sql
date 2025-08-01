-- Fix infinite recursion completely by removing all problematic policies and creating simple ones

-- Drop ALL existing policies on gw_profiles
DROP POLICY IF EXISTS "Admin access all profiles" ON public.gw_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.gw_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.gw_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.gw_profiles;

-- Create completely simple policies that don't reference other tables
CREATE POLICY "gw_profiles_select_own" 
ON public.gw_profiles FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "gw_profiles_insert_own" 
ON public.gw_profiles FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "gw_profiles_update_own" 
ON public.gw_profiles FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "gw_profiles_delete_own" 
ON public.gw_profiles FOR DELETE 
USING (user_id = auth.uid());

-- Create a simple admin policy using only the profiles table
CREATE POLICY "gw_profiles_admin_access" 
ON public.gw_profiles FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super-admin')
  )
);