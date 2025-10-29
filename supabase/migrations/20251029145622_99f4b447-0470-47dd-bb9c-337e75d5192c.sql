
-- First, create unique constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'gw_user_module_permissions_user_module_unique'
    ) THEN
        ALTER TABLE gw_user_module_permissions 
        ADD CONSTRAINT gw_user_module_permissions_user_module_unique 
        UNIQUE (user_id, module_id);
    END IF;
END $$;

-- Grant Rayne (Treasurer) access to remaining financial modules
INSERT INTO gw_user_module_permissions (user_id, module_id, granted_by, notes, is_active)
VALUES 
  ('5a7197d5-bf6b-4658-a25d-5dcc99ee6e81', 'check-requests', '4e6c2ec0-1f83-449a-a984-8920f6056ab5', 'Treasurer financial module', true),
  ('5a7197d5-bf6b-4658-a25d-5dcc99ee6e81', 'contracts', '4e6c2ec0-1f83-449a-a984-8920f6056ab5', 'Treasurer financial module', true),
  ('5a7197d5-bf6b-4658-a25d-5dcc99ee6e81', 'approval-system', '4e6c2ec0-1f83-449a-a984-8920f6056ab5', 'Treasurer financial module', true),
  ('5a7197d5-bf6b-4658-a25d-5dcc99ee6e81', 'ai-financial', '4e6c2ec0-1f83-449a-a984-8920f6056ab5', 'Treasurer financial module', true)
ON CONFLICT (user_id, module_id) DO NOTHING;