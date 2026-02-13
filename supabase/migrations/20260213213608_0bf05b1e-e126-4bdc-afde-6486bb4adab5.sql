
-- Update transition_user_role to also update user_roles table
CREATE OR REPLACE FUNCTION public.transition_user_role(
    target_user_id UUID,
    new_role TEXT,
    reason TEXT DEFAULT NULL,
    admin_notes TEXT DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_role TEXT;
    admin_user_id UUID;
BEGIN
    admin_user_id := auth.uid();
    
    -- Check if current user is admin OR executive board member
    IF NOT EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = admin_user_id 
        AND (is_admin = true OR is_super_admin = true OR is_exec_board = true)
    ) THEN
        RAISE EXCEPTION 'Only admins and executive board members can transition user roles';
    END IF;
    
    -- Get current role
    SELECT role INTO current_role 
    FROM public.gw_profiles 
    WHERE user_id = target_user_id;
    
    IF current_role IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Update the user's role in gw_profiles
    UPDATE public.gw_profiles 
    SET role = new_role, updated_at = now()
    WHERE user_id = target_user_id;
    
    -- Also update/insert into user_roles table (source of truth for role display)
    DELETE FROM public.user_roles 
    WHERE user_id = target_user_id 
    AND role = current_role;
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, new_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Log the transition
    INSERT INTO public.user_role_transitions (
        user_id, from_role, to_role, transition_reason, changed_by, notes
    ) VALUES (
        target_user_id, current_role, new_role, reason, admin_user_id, admin_notes
    );
    
    RETURN true;
END;
$$;
