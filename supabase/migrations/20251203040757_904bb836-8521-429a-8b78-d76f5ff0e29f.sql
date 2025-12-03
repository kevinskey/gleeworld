
-- Populate "All Members" group with all users who have role 'member'
INSERT INTO gw_group_members (group_id, user_id, role, joined_at, is_muted)
SELECT 
  '865f5ba0-f374-4ce6-8e33-655434a5d1b7'::uuid as group_id,
  gp.user_id,
  'member' as role,
  now() as joined_at,
  false as is_muted
FROM gw_profiles gp
WHERE gp.role = 'member' 
  AND gp.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM gw_group_members gm 
    WHERE gm.group_id = '865f5ba0-f374-4ce6-8e33-655434a5d1b7'::uuid 
    AND gm.user_id = gp.user_id
  );
