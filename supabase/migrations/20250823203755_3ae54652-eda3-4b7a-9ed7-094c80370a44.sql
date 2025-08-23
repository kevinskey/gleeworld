-- First, get Alexandra Williams' user_id from gw_profiles
-- Then insert her as a librarian if she's not already an active librarian

-- Insert Alexandra Williams as librarian if she exists in gw_profiles and isn't already an active librarian
INSERT INTO public.gw_executive_board_members (user_id, position, is_active, created_at, updated_at)
SELECT 
  gp.user_id,
  'librarian'::executive_position,
  true,
  now(),
  now()
FROM public.gw_profiles gp
WHERE gp.full_name = 'Alexandra Williams'
AND NOT EXISTS (
  SELECT 1 FROM public.gw_executive_board_members ebm
  WHERE ebm.user_id = gp.user_id 
  AND ebm.position = 'librarian' 
  AND ebm.is_active = true
);