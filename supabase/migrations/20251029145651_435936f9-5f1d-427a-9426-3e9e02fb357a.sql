
-- Grant Rayne (Treasurer) access to remaining financial modules
-- First check if they already exist to avoid duplicates
DO $$
BEGIN
  -- Check-requests module
  IF NOT EXISTS (
    SELECT 1 FROM gw_user_module_permissions 
    WHERE user_id = '5a7197d5-bf6b-4658-a25d-5dcc99ee6e81' 
    AND module_id = 'check-requests'
    AND is_active = true
  ) THEN
    INSERT INTO gw_user_module_permissions (user_id, module_id, granted_by, notes, is_active)
    VALUES ('5a7197d5-bf6b-4658-a25d-5dcc99ee6e81', 'check-requests', '4e6c2ec0-1f83-449a-a984-8920f6056ab5', 'Treasurer financial module', true);
  END IF;

  -- Contracts module
  IF NOT EXISTS (
    SELECT 1 FROM gw_user_module_permissions 
    WHERE user_id = '5a7197d5-bf6b-4658-a25d-5dcc99ee6e81' 
    AND module_id = 'contracts'
    AND is_active = true
  ) THEN
    INSERT INTO gw_user_module_permissions (user_id, module_id, granted_by, notes, is_active)
    VALUES ('5a7197d5-bf6b-4658-a25d-5dcc99ee6e81', 'contracts', '4e6c2ec0-1f83-449a-a984-8920f6056ab5', 'Treasurer financial module', true);
  END IF;

  -- Approval-system module
  IF NOT EXISTS (
    SELECT 1 FROM gw_user_module_permissions 
    WHERE user_id = '5a7197d5-bf6b-4658-a25d-5dcc99ee6e81' 
    AND module_id = 'approval-system'
    AND is_active = true
  ) THEN
    INSERT INTO gw_user_module_permissions (user_id, module_id, granted_by, notes, is_active)
    VALUES ('5a7197d5-bf6b-4658-a25d-5dcc99ee6e81', 'approval-system', '4e6c2ec0-1f83-449a-a984-8920f6056ab5', 'Treasurer financial module', true);
  END IF;

  -- AI-financial module
  IF NOT EXISTS (
    SELECT 1 FROM gw_user_module_permissions 
    WHERE user_id = '5a7197d5-bf6b-4658-a25d-5dcc99ee6e81' 
    AND module_id = 'ai-financial'
    AND is_active = true
  ) THEN
    INSERT INTO gw_user_module_permissions (user_id, module_id, granted_by, notes, is_active)
    VALUES ('5a7197d5-bf6b-4658-a25d-5dcc99ee6e81', 'ai-financial', '4e6c2ec0-1f83-449a-a984-8920f6056ab5', 'Treasurer financial module', true);
  END IF;
END $$;
