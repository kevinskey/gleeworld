-- Fix potential infinite recursion in RLS policies by dropping and recreating them properly
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all media" ON public.gw_media_library;

-- Recreate the admin policy using existing security definer function
CREATE POLICY "Admins can view all media"
ON public.gw_media_library
FOR SELECT
USING (public.is_current_user_admin_or_super_admin());

-- Add a simple policy for authenticated users to test basic access
CREATE POLICY "Authenticated users can view all media"
ON public.gw_media_library
FOR SELECT
USING (auth.uid() IS NOT NULL);