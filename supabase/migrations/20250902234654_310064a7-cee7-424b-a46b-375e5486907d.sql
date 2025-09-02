-- Deactivate the test tour manager entry for Kevin Phillip Johnson
-- so that Onnesty Peele (the real tour manager) appears in the executive board dropdown

UPDATE gw_executive_board_members 
SET is_active = false, 
    updated_at = now(),
    notes = 'Deactivated - was test entry, Onnesty Peele is the active tour manager'
WHERE user_id = '4e6c2ec0-1f83-449a-a984-8920f6056ab5' 
  AND position = 'tour_manager' 
  AND notes = 'Added for testing executive board permissions';