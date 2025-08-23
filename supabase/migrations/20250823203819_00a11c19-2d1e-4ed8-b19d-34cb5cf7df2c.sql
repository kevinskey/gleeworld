-- Insert Alexandra Williams as librarian with proper academic_year
INSERT INTO public.gw_executive_board_members (user_id, position, academic_year, is_active, created_at, updated_at)
SELECT 
  gp.user_id,
  'librarian'::executive_position,
  '2024-25',  -- Set current academic year
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