-- Grant Jordyn access to all key admin modules
INSERT INTO public.username_permissions (user_email, module_name, is_active, granted_at)
VALUES 
  ('jordynoneal@spelman.edu', 'user_management', true, now()),
  ('jordynoneal@spelman.edu', 'permissions', true, now()),
  ('jordynoneal@spelman.edu', 'admin_dashboard', true, now()),
  ('jordynoneal@spelman.edu', 'super_admin', true, now()),
  ('jordynoneal@spelman.edu', 'system_settings', true, now()),
  ('jordynoneal@spelman.edu', 'security_audit', true, now()),
  ('jordynoneal@spelman.edu', 'module_management', true, now()),
  ('jordynoneal@spelman.edu', 'role_management', true, now())
ON CONFLICT (user_email, module_name) 
DO UPDATE SET 
  is_active = true,
  granted_at = now(),
  updated_at = now();