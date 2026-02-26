INSERT INTO gw_user_module_permissions (user_id, module_id, is_active, granted_by, notes)
VALUES ('b648f12d-9a63-4eae-b768-413a467567b4', 'tour-management', true, '4e6c2ec0-1f83-449a-a984-8920f6056ab5', 'Granted tour management access for Onnesty Peele')
ON CONFLICT DO NOTHING;