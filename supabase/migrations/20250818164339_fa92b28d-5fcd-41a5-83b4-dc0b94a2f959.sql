-- Grant user-management permission to Chief of Staff
INSERT INTO username_permissions (user_email, module_name, granted_at, is_active, notes)
VALUES (
  'jordynoneal@spelman.edu',
  'user-management',
  NOW(),
  true,
  'Chief of Staff user management access granted'
);