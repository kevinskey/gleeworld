-- Fix the verify_admin_access function to resolve the ambiguous column reference
CREATE OR REPLACE FUNCTION public.verify_admin_access(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_profile RECORD;
BEGIN
    -- Get the user's profile from gw_profiles
    SELECT role, is_admin, is_super_admin
    INTO user_profile
    FROM public.gw_profiles
    WHERE gw_profiles.user_id = user_id_param;
    
    -- Check if user exists and has admin privileges
    IF user_profile IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Return true if user is admin or super admin
    RETURN (
        user_profile.is_admin = true OR 
        user_profile.is_super_admin = true OR 
        user_profile.role IN ('admin', 'super-admin')
    );
END;
$$;