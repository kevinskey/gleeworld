-- Create assignment for settings module to admin group
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
WHERE m.name = 'settings'
AND NOT EXISTS (
  SELECT 1 FROM public.gw_module_assignments ma 
  WHERE ma.module_id = m.id AND ma.assigned_to_group = 'admin'
);