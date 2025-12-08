-- Add Charity Dent to main message groups
INSERT INTO gw_group_members (group_id, user_id, role, is_muted)
VALUES 
  ('13e8ef65-e1e8-4619-99b9-bd48dd9bac1e', '6d44a9d0-70df-4a74-9623-002f4365253c', 'member', false),
  ('865f5ba0-f374-4ce6-8e33-655434a5d1b7', '6d44a9d0-70df-4a74-9623-002f4365253c', 'member', false)
ON CONFLICT (group_id, user_id) DO NOTHING;