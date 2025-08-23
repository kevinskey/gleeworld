-- Remove duplicate tour_manager entries (keep the newest one)
UPDATE gw_executive_board_members 
SET is_active = false 
WHERE id = '2464650c-d81e-41d7-bf71-61dd0c91dcfc';