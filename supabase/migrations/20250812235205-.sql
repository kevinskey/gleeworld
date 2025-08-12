-- Add RLS policy for executive board members to view all auditions
CREATE POLICY "Executive board members can view all auditions" 
ON public.gw_auditions 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE gw_profiles.user_id = auth.uid() 
    AND (
      gw_profiles.is_admin = true 
      OR gw_profiles.is_super_admin = true 
      OR gw_profiles.role = 'executive'
    )
  )
  OR EXISTS (
    SELECT 1 FROM username_permissions up
    WHERE up.user_email = auth.email()
    AND up.module_name = 'auditions'
    AND up.is_active = true
    AND (up.expires_at IS NULL OR up.expires_at > now())
  )
);

-- Add RLS policy for executive board members to manage all auditions  
CREATE POLICY "Executive board members can manage all auditions"
ON public.gw_auditions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE gw_profiles.user_id = auth.uid() 
    AND (
      gw_profiles.is_admin = true 
      OR gw_profiles.is_super_admin = true 
      OR gw_profiles.role = 'executive'
    )
  )
  OR EXISTS (
    SELECT 1 FROM username_permissions up
    WHERE up.user_email = auth.email()
    AND up.module_name = 'auditions'
    AND up.is_active = true
    AND (up.expires_at IS NULL OR up.expires_at > now())
  )
);