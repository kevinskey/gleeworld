-- Create wardrobe profiles for existing members who don't have them yet
INSERT INTO gw_member_wardrobe_profiles (user_id, pearl_status, created_at, updated_at)
SELECT 
  gp.user_id,
  'not_assigned' as pearl_status,
  NOW() as created_at,
  NOW() as updated_at
FROM gw_profiles gp
WHERE gp.role IN ('member', 'alumna', 'executive') -- Only create for actual glee club members
AND NOT EXISTS (
  SELECT 1 FROM gw_member_wardrobe_profiles wmwp 
  WHERE wmwp.user_id = gp.user_id
);