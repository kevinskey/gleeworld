-- First, let's check if Ava exists and get her user_id
DO $$
DECLARE
    ava_user_id uuid;
BEGIN
    -- Get Ava's user_id
    SELECT user_id INTO ava_user_id 
    FROM public.gw_profiles 
    WHERE email = 'ava.challenger@example.com';
    
    -- Update her profile to be a member with PR coordinator role
    UPDATE public.gw_profiles 
    SET 
      role = 'member',
      exec_board_role = 'pr_coordinator',
      is_exec_board = true,
      updated_at = now()
    WHERE email = 'ava.challenger@example.com';
    
    -- Remove any existing executive board entry for this user first
    DELETE FROM public.gw_executive_board_members 
    WHERE user_id = ava_user_id;
    
    -- Insert new executive board entry
    IF ava_user_id IS NOT NULL THEN
        INSERT INTO public.gw_executive_board_members (user_id, position, is_active, primary_tab)
        VALUES (ava_user_id, 'pr_coordinator'::executive_position, true, 'pr-hub');
    END IF;
END $$;