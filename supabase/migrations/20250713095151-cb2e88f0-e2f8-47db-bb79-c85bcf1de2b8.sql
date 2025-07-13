-- Drop the problematic policies on gw_profiles that are causing infinite recursion
DROP POLICY IF EXISTS "Admins can view all gw_profiles" ON public.gw_profiles;
DROP POLICY IF EXISTS "Users can view their own gw_profile" ON public.gw_profiles;
DROP POLICY IF EXISTS "Users can update their own gw_profile" ON public.gw_profiles;

-- Create simple, non-recursive policies for gw_profiles
CREATE POLICY "Allow read access to gw_profiles" ON public.gw_profiles
FOR SELECT USING (true);

CREATE POLICY "Allow insert to gw_profiles" ON public.gw_profiles
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update to gw_profiles" ON public.gw_profiles
FOR UPDATE USING (true);