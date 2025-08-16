-- Update existing policies to include alumnae liaison permissions
-- First, update the Admin full access policy to include alumnae liaisons for alumnae profiles
DROP POLICY IF EXISTS "Admin full access to all profiles" ON public.gw_profiles;

CREATE POLICY "Admin and alumnae liaison profile access" 
ON public.gw_profiles 
FOR ALL 
USING (
  is_current_user_admin() OR 
  (role = 'alumna' AND is_alumnae_liaison())
);