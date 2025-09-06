-- Add full admin permissions for setlists table
-- Admins currently only have SELECT permission, but should have full management access

-- Drop the existing admin view-only policy on setlists
DROP POLICY IF EXISTS "Admins can view all setlists" ON public.setlists;

-- Add comprehensive admin management policy for setlists
CREATE POLICY "Admins can manage all setlists" 
ON public.setlists 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);