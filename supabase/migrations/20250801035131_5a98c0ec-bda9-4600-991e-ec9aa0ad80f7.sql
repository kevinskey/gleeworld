-- Update all executive board members to have 'member' role in gw_profiles
-- This bypasses the main profiles table triggers
UPDATE gw_profiles 
SET role = 'member', updated_at = now()
WHERE user_id IN (
  SELECT ebm.user_id 
  FROM gw_executive_board_members ebm 
  WHERE ebm.is_active = true
) AND role != 'member';