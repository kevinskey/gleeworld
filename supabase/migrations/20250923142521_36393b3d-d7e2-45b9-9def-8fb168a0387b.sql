-- Register missing modules so they appear on the Super Admin dashboard via the unified modules system
-- This makes them visible in MetalHeaderDashboard for admins/super-admins

-- Ensure the gw_modules table has entries for Service Provider Management and My Appointments
INSERT INTO public.gw_modules (name, description, category, is_active, default_permissions, key)
VALUES 
  (
    'Service Provider Management',
    'Assign and manage users as appointment service providers',
    'communications',
    true,
    '["view"]',
    'service-provider-management'
  )
ON CONFLICT (key) DO UPDATE 
  SET is_active = EXCLUDED.is_active,
      description = EXCLUDED.description,
      category = EXCLUDED.category;

INSERT INTO public.gw_modules (name, description, category, is_active, default_permissions, key)
VALUES 
  (
    'My Appointments',
    'Personal appointment management for assigned service providers',
    'communications',
    true,
    '["view"]',
    'assignable-appointments'
  )
ON CONFLICT (key) DO UPDATE 
  SET is_active = EXCLUDED.is_active,
      description = EXCLUDED.description,
      category = EXCLUDED.category;