-- Add some test module assignments so users can see modules on their dashboards

-- Insert test assignments for common modules
INSERT INTO public.gw_module_assignments (
  module_id, 
  assignment_type, 
  assigned_to_group, 
  permissions, 
  notes,
  is_active
) VALUES 
-- Assign sight-reading modules to all users
(
  'd5420416-32f7-4ddc-b737-13cce1421ac6', -- sight-reading-generator
  'group',
  'all',
  ARRAY['view'],
  'Default assignment - Sight reading generator for all users',
  true
),
(
  '8d2a1773-75b9-420a-a244-6b4781515365', -- sight-reading-preview
  'group',
  'all', 
  ARRAY['view'],
  'Default assignment - Sight reading preview for all users',
  true
),
-- Assign sight-singing-management to members
(
  'bfed0f36-4b93-40cd-8ce1-67be41c0c295', -- sight-singing-management
  'group',
  'member',
  ARRAY['view'],
  'Default assignment - Sight singing for members',
  true
);

-- Also create some module assignments for different role types
-- Get some other popular modules and assign them
INSERT INTO public.gw_module_assignments (
  module_id, 
  assignment_type, 
  assigned_to_group, 
  permissions, 
  notes,
  is_active
)
SELECT 
  id,
  'group',
  'all',
  ARRAY['view'],
  'Default assignment - ' || name || ' for all users',
  true
FROM public.gw_modules 
WHERE name IN ('music-library', 'events', 'budgets', 'attendance')
AND is_active = true
LIMIT 4;