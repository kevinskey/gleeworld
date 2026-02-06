-- Update transition_user_role to allow exec board members
CREATE OR REPLACE FUNCTION public.transition_user_role(
    target_user_id UUID,
    new_role TEXT,
    reason TEXT DEFAULT NULL,
    admin_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    
    -- Update the user's role
    UPDATE public.gw_profiles 
    SET role = new_role, updated_at = now()
    WHERE user_id = target_user_id;
    
    -- Log the transition
    INSERT INTO public.user_role_transitions (
        user_id, from_role, to_role, transition_reason, changed_by, notes
    ) VALUES (
        target_user_id, current_role, new_role, reason, admin_user_id, admin_notes
    );
    
    RETURN true;
END;
$$;

-- Also update the INSERT policy on user_role_transitions to allow exec board
DROP POLICY IF EXISTS "Admins can insert role transitions" ON public.user_role_transitions;
CREATE POLICY "Admins and exec board can insert role transitions" 
ON public.user_role_transitions 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = auth.uid() 
        AND (is_admin = true OR is_super_admin = true OR is_exec_board = true)
    )
);

-- Update SELECT policy to also allow exec board to view transitions
DROP POLICY IF EXISTS "Admins can view all role transitions" ON public.user_role_transitions;
CREATE POLICY "Admins and exec board can view all role transitions" 
ON public.user_role_transitions 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = auth.uid() 
        AND (is_admin = true OR is_super_admin = true OR is_exec_board = true)
    )
);