-- Create wardrobe profiles for users who should have wardrobe access
-- Let's include fans too since they might be potential members, or adjust this based on actual membership
INSERT INTO gw_member_wardrobe_profiles (user_id, pearl_status, created_at, updated_at)
SELECT 
  gp.user_id,
  'not_assigned' as pearl_status,
  NOW() as created_at,
  NOW() as updated_at
FROM gw_profiles gp
WHERE NOT EXISTS (
  SELECT 1 FROM gw_member_wardrobe_profiles wmwp 
  WHERE wmwp.user_id = gp.user_id
)
-- For now, create for all users since they might all need wardrobe access
-- This can be filtered later based on actual membership status
LIMIT 20; -- Start with 20 to test