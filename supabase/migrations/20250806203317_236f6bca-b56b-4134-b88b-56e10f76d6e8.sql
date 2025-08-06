-- Update tour manager permissions to have access (not just manage)
-- This will allow Onnesty to see all her tour manager modules

UPDATE gw_executive_position_functions 
SET can_access = true 
WHERE position = 'tour_manager' 
AND can_manage = true 
AND can_access = false;