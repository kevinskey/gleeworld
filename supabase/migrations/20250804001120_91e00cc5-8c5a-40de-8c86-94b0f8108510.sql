-- Update Ava Challenger to be a member with PR coordinator executive board role
UPDATE public.gw_profiles 
SET 
  role = 'member',
  exec_board_role = 'pr_coordinator',
  is_exec_board = true,
  updated_at = now()
WHERE email = 'ava.challenger@example.com';

-- Ensure she's in the executive board members table as PR coordinator
INSERT INTO public.gw_executive_board_members (user_id, position, is_active, primary_tab)
SELECT user_id, 'pr_coordinator'::executive_position, true, 'pr-hub'
FROM public.gw_profiles 
WHERE email = 'ava.challenger@example.com'
ON CONFLICT (user_id) DO UPDATE SET 
  position = 'pr_coordinator'::executive_position,
  is_active = true,
  primary_tab = 'pr-hub',
  updated_at = now();