-- Drop the problematic policy with 'public' role and recreate with 'authenticated'
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.gw_profiles;

-- Create a proper policy for authenticated users to update their own profile
CREATE POLICY "users_can_update_own_profile" 
ON public.gw_profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);