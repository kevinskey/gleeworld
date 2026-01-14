-- Grant access via gw_role_module_permissions for admin, super-admin, exec-board, and secretary roles
INSERT INTO public.gw_role_module_permissions (role, module_name, permission_type, is_active, granted_by)
VALUES 
  ('admin', 'course-attendance-ledger', 'view', true, '343c7cd1-6cce-455d-b001-ceb044b5ca32'),
  ('admin', 'course-attendance-ledger', 'manage', true, '343c7cd1-6cce-455d-b001-ceb044b5ca32'),
  ('super-admin', 'course-attendance-ledger', 'view', true, '343c7cd1-6cce-455d-b001-ceb044b5ca32'),
  ('super-admin', 'course-attendance-ledger', 'manage', true, '343c7cd1-6cce-455d-b001-ceb044b5ca32'),
  ('exec-board', 'course-attendance-ledger', 'view', true, '343c7cd1-6cce-455d-b001-ceb044b5ca32'),
  ('exec-board', 'course-attendance-ledger', 'manage', true, '343c7cd1-6cce-455d-b001-ceb044b5ca32'),
  ('secretary', 'course-attendance-ledger', 'view', true, '343c7cd1-6cce-455d-b001-ceb044b5ca32'),
  ('secretary', 'course-attendance-ledger', 'manage', true, '343c7cd1-6cce-455d-b001-ceb044b5ca32')
ON CONFLICT DO NOTHING;