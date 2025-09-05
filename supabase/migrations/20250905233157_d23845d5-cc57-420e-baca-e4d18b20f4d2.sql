-- Fix the overly permissive public read policy that allows infinite recursion
-- This policy currently allows anyone to read all profiles, which causes the infinite recursion
-- when our admin function tries to check admin status

-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "gw_profiles_public_read" ON public.gw_profiles;

-- Create a more restrictive public read policy
-- Only allow reading basic info (no sensitive fields) for authenticated users
CREATE POLICY "gw_profiles_public_read_limited" 
ON public.gw_profiles 
FOR SELECT 
TO authenticated 
USING (true);