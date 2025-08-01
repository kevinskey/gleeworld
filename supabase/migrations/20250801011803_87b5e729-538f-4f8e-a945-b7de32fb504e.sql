-- Fix all remaining RLS policy issues on gw_profiles table

-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "Admins can manage all profiles v2" ON public.gw_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.gw_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.gw_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.gw_profiles;
DROP POLICY IF EXISTS "Authenticated users can create their profile" ON public.gw_profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.gw_profiles;
DROP POLICY IF EXISTS "Authenticated users can update their own profile" ON public.gw_profiles;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view own profile" 
ON public.gw_profiles FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile" 
ON public.gw_profiles FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile" 
ON public.gw_profiles FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Admin access all profiles" 
ON public.gw_profiles FOR ALL 
USING (public.is_current_user_gw_admin());