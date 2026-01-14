-- Fix the trigger to use gw_profiles instead of profiles
CREATE OR REPLACE FUNCTION prevent_gw_profile_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent users from changing their own admin status
    IF OLD.user_id = auth.uid() AND (
        OLD.is_admin != NEW.is_admin OR 
        OLD.is_super_admin != NEW.is_super_admin
    ) THEN
        RAISE EXCEPTION 'Security violation: Cannot modify your own admin privileges';
    END IF;
    
    -- Only existing admins can grant admin privileges
    IF (OLD.is_admin != NEW.is_admin OR OLD.is_super_admin != NEW.is_super_admin) THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.gw_profiles 
            WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
        ) THEN
            RAISE EXCEPTION 'Permission denied: Only admins can modify admin privileges';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;