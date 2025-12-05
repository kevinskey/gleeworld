
-- Add Kevin Johnson to All Members group
INSERT INTO gw_group_members (group_id, user_id, role)
VALUES ('865f5ba0-f374-4ce6-8e33-655434a5d1b7', '4e6c2ec0-1f83-449a-a984-8920f6056ab5', 'member')
ON CONFLICT (group_id, user_id) DO NOTHING;
