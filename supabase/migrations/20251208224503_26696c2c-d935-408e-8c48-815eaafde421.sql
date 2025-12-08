-- Drop the problematic UPDATE policy
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.gw_profiles;

-- Create a new UPDATE policy using the safe admin check function
CREATE POLICY "Admins can update all profiles" 
ON public.gw_profiles 
FOR UPDATE 
TO authenticated
USING (
  is_gw_admin_safe() OR (user_id = auth.uid())
)
WITH CHECK (
  is_gw_admin_safe() OR (user_id = auth.uid())
);