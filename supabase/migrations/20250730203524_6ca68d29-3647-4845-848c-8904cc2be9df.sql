-- Fix the infinite recursion issue by dropping the problematic policy and creating a simpler one
DROP POLICY IF EXISTS "Authenticated users can view basic profile info of exec board members" ON public.gw_profiles;

-- Create a simpler policy that doesn't cause recursion
-- Allow authenticated users to view gw_profiles for executive board functionality
CREATE POLICY "Allow authenticated users to view profiles for exec board context" 
ON public.gw_profiles 
FOR SELECT 
TO authenticated
USING (true);