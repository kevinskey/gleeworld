INSERT INTO gw_user_module_permissions (user_id, module_id, is_active, granted_by, notes)
VALUES ('fdeeab45-8655-43f0-a77b-edb7c5dc9078', 'tour-management', true, '4e6c2ec0-1f83-449a-a984-8920f6056ab5', 'Granted tour management access for contract uploads')
ON CONFLICT DO NOTHING;