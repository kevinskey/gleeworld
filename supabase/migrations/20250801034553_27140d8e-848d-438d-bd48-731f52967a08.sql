-- Add missing enum values for executive positions
ALTER TYPE executive_position ADD VALUE IF NOT EXISTS 'student_conductor';
ALTER TYPE executive_position ADD VALUE IF NOT EXISTS 'tour_manager'; 
ALTER TYPE executive_position ADD VALUE IF NOT EXISTS 'assistant_chaplain';

-- Update all mismatched positions to use underscores instead of hyphens
UPDATE gw_executive_board_members SET position = 'student_conductor'::executive_position 
WHERE user_id = '6f14998d-a7ba-47f2-a331-5bc44445ec98';

UPDATE gw_executive_board_members SET position = 'tour_manager'::executive_position 
WHERE user_id = 'b648f12d-9a63-4eae-b768-413a467567b4';

UPDATE gw_executive_board_members SET position = 'assistant_chaplain'::executive_position 
WHERE user_id = 'fdeeab45-8655-43f0-a77b-edb7c5dc9078';

-- Also update the gw_profiles to use consistent naming (underscores)
UPDATE gw_profiles SET exec_board_role = 'student_conductor' 
WHERE exec_board_role = 'student-conductor';

UPDATE gw_profiles SET exec_board_role = 'tour_manager' 
WHERE exec_board_role = 'tour-manager';

UPDATE gw_profiles SET exec_board_role = 'assistant_chaplain' 
WHERE exec_board_role = 'assistant_chaplain';