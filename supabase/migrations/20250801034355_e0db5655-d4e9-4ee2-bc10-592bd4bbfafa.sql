-- Add set_up_crew_manager to the executive_position enum
ALTER TYPE executive_position ADD VALUE 'set_up_crew_manager';

-- Update Allana's executive board position to match her exec_board_role  
UPDATE gw_executive_board_members 
SET position = 'set_up_crew_manager'::executive_position
WHERE user_id = 'c9260ed4-144d-439b-be51-bd0f387b5ae6';