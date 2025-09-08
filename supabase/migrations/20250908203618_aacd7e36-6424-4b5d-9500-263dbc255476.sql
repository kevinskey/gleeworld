-- Create a secure function to promote user to super admin
CREATE OR REPLACE FUNCTION promote_to_super_admin(target_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Update the user to super admin
  UPDATE public.gw_profiles 
  SET 
    is_super_admin = true,
    is_admin = true,
    role = 'super-admin',
    verified = true,
    updated_at = now()
  WHERE email = target_email;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User promoted to super admin successfully'
  );
END;
$$;

-- Grant execute permission to authenticated users temporarily for setup
GRANT EXECUTE ON FUNCTION promote_to_super_admin(text) TO authenticated;

-- Execute the promotion
SELECT promote_to_super_admin('autumnbrooks@spelman.edu');