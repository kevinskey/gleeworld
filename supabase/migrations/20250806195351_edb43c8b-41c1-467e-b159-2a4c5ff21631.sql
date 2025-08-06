-- Add Onnesty to the executive board as tour_manager
INSERT INTO public.gw_executive_board_members (user_id, position, is_active)
VALUES ('b648f12d-9a63-4eae-b768-413a467567b4', 'tour_manager', true)
ON CONFLICT (user_id) DO UPDATE SET 
  position = 'tour_manager',
  is_active = true;