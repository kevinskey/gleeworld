-- Grant super admin permissions to arianaswindell@spelman.edu for all executive modules
INSERT INTO username_permissions (user_email, module_name, is_active, notes)
VALUES 
  ('arianaswindell@spelman.edu', 'calendar-management', true, 'Super admin access granted automatically'),
  ('arianaswindell@spelman.edu', 'user-management', true, 'Super admin access granted automatically'),
  ('arianaswindell@spelman.edu', 'executive-board', true, 'Super admin access granted automatically'),
  ('arianaswindell@spelman.edu', 'admin-tools', true, 'Super admin access granted automatically'),
  ('arianaswindell@spelman.edu', 'system-settings', true, 'Super admin access granted automatically')
ON CONFLICT (user_email, module_name) 
DO UPDATE SET 
  is_active = true,
  updated_at = now(),
  notes = 'Super admin access granted automatically';