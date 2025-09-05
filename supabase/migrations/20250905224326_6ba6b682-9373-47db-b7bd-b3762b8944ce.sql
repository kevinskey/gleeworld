-- Grant fanpage module access to phoenixking@spelman.edu
INSERT INTO public.username_permissions (user_email, module_name, is_active, granted_at)
VALUES ('phoenixking@spelman.edu', 'fanpage', true, now())
ON CONFLICT (user_email, module_name) 
DO UPDATE SET 
  is_active = true,
  granted_at = now(),
  updated_at = now();