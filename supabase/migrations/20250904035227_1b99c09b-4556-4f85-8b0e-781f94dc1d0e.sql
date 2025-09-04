-- Add Rayne Stewart (treasurer) to the executive board members table
INSERT INTO public.gw_executive_board_members (
  user_id, 
  position, 
  is_active, 
  start_date
) VALUES (
  '5a7197d5-bf6b-4658-a25d-5dcc99ee6e81', 
  'treasurer', 
  true, 
  CURRENT_DATE
) ON CONFLICT (user_id) DO UPDATE SET
  position = EXCLUDED.position,
  is_active = true,
  start_date = EXCLUDED.start_date;