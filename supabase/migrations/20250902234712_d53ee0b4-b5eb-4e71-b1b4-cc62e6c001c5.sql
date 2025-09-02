-- Delete the test tour manager entry instead of deactivating it
-- to avoid unique constraint issues

DELETE FROM gw_executive_board_members 
WHERE user_id = '4e6c2ec0-1f83-449a-a984-8920f6056ab5' 
  AND position = 'tour_manager' 
  AND notes = 'Added for testing executive board permissions';