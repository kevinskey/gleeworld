-- Create the settings module entry with correct columns
INSERT INTO public.gw_modules (
  name,
  description,
  category,
  is_active
) VALUES (
  'settings',
  'System settings and module assignment management',
  'System',
  true
);

-- Now assign it to admin group
INSERT INTO public.gw_module_assignments (
  module_id, 
  assigned_to_group, 
  assignment_type, 
  permissions, 
  notes
)
SELECT 
  m.id,
  'admin',
  'group',
  ARRAY['view', 'manage'],
  'Admin access to settings module'
FROM public.gw_modules m 
WHERE m.name = 'settings';