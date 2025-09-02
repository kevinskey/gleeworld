-- Add new module to app functions
INSERT INTO public.gw_app_functions (function_name, display_name, description, category)
VALUES 
  ('member_mentorship', 'Member Mentorship', 'Manage mentorship programs and relationships', 'member_services'),
  ('academic_tracking', 'Academic Tracking', 'Track academic progress and grades', 'academics'),
  ('vocal_health_monitoring', 'Vocal Health Monitoring', 'Monitor and track vocal health', 'health');

-- Grant specific positions access to these functions
INSERT INTO public.gw_executive_position_functions (position, function_id, can_access, can_manage)
SELECT 
  'secretary', 
  af.id, 
  true, 
  true
FROM public.gw_app_functions af 
WHERE af.function_name IN ('member_mentorship', 'academic_tracking');

-- Grant treasurer access to academic tracking
INSERT INTO public.gw_executive_position_functions (position, function_id, can_access, can_manage)
SELECT 
  'treasurer', 
  af.id, 
  true, 
  false
FROM public.gw_app_functions af 
WHERE af.function_name = 'academic_tracking';

-- Grant historian access to vocal health monitoring
INSERT INTO public.gw_executive_position_functions (position, function_id, can_access, can_manage)
SELECT 
  'historian', 
  af.id, 
  true, 
  true
FROM public.gw_app_functions af 
WHERE af.function_name = 'vocal_health_monitoring';