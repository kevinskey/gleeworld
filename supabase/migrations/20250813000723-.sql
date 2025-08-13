-- Test the security definer function more thoroughly and fix any issues
-- First, let's check what auth.email() returns and debug the function

-- Create a debug version of the function to see what's happening
CREATE OR REPLACE FUNCTION public.debug_audition_permissions()
RETURNS JSONB AS $$
DECLARE
  current_user_id UUID;
  current_email TEXT;
  is_admin BOOLEAN := false;
  is_exec BOOLEAN := false;
  has_username_perm BOOLEAN := false;
  result JSONB;
BEGIN
  current_user_id := auth.uid();
  current_email := auth.email();
  
  -- Check admin status
  SELECT EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = current_user_id 
    AND (is_admin = true OR is_super_admin = true)
  ) INTO is_admin;
  
  -- Check executive status
  SELECT EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = current_user_id 
    AND role = 'executive'
  ) INTO is_exec;
  
  -- Check username permission
  SELECT EXISTS (
    SELECT 1 FROM username_permissions up
    WHERE up.user_email = current_email
    AND up.module_name = 'auditions'
    AND up.is_active = true
    AND (up.expires_at IS NULL OR up.expires_at > now())
  ) INTO has_username_perm;
  
  result := jsonb_build_object(
    'user_id', current_user_id,
    'email', current_email,
    'is_admin', is_admin,
    'is_executive', is_exec,
    'has_username_permission', has_username_perm,
    'can_view', (is_admin OR is_exec OR has_username_perm)
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;