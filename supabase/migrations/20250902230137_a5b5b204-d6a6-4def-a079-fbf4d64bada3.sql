-- Add new modules to app functions (using correct column name 'name' instead of 'function_name')
INSERT INTO public.gw_app_functions (name, description, category, module)
VALUES 
  ('member_mentorship', 'Manage mentorship programs and relationships', 'member_services', 'member_mentorship'),
  ('academic_tracking', 'Track academic progress and grades', 'academics', 'academic_tracking'),
  ('vocal_health_monitoring', 'Monitor and track vocal health', 'health', 'vocal_health_monitoring');

-- Grant specific positions access to these functions
INSERT INTO public.gw_executive_position_functions (position, function_id, can_access, can_manage)
SELECT 
  'secretary', 
  af.id, 
  true, 
  true
FROM public.gw_app_functions af 
WHERE af.name IN ('member_mentorship', 'academic_tracking');

-- Grant treasurer access to academic tracking (read-only)
INSERT INTO public.gw_executive_position_functions (position, function_id, can_access, can_manage)
SELECT 
  'treasurer', 
  af.id, 
  true, 
  false
FROM public.gw_app_functions af 
WHERE af.name = 'academic_tracking';

-- Grant historian access to vocal health monitoring
INSERT INTO public.gw_executive_position_functions (position, function_id, can_access, can_manage)
SELECT 
  'historian', 
  af.id, 
  true, 
  true
FROM public.gw_app_functions af 
WHERE af.name = 'vocal_health_monitoring';