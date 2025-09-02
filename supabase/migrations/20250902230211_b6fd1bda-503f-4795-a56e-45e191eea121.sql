-- Add new unique modules to app functions  
INSERT INTO public.gw_app_functions (name, description, category, module)
VALUES 
  ('member_wellness_tracking', 'Track member wellness and health metrics', 'health', 'member_wellness'),
  ('peer_tutoring_coordination', 'Coordinate peer tutoring programs', 'academics', 'peer_tutoring'),
  ('social_events_planning', 'Plan and coordinate social events', 'social', 'social_events')
ON CONFLICT (name) DO NOTHING;

-- Grant secretary access to member wellness tracking
INSERT INTO public.gw_executive_position_functions (position, function_id, can_access, can_manage)
SELECT 
  'secretary', 
  af.id, 
  true, 
  true
FROM public.gw_app_functions af 
WHERE af.name = 'member_wellness_tracking'
ON CONFLICT DO NOTHING;

-- Grant vice_president access to peer tutoring
INSERT INTO public.gw_executive_position_functions (position, function_id, can_access, can_manage)
SELECT 
  'vice_president', 
  af.id, 
  true, 
  true
FROM public.gw_app_functions af 
WHERE af.name = 'peer_tutoring_coordination'
ON CONFLICT DO NOTHING;

-- Grant social committee access to social events
INSERT INTO public.gw_executive_position_functions (position, function_id, can_access, can_manage)
SELECT 
  'chaplain', 
  af.id, 
  true, 
  true
FROM public.gw_app_functions af 
WHERE af.name = 'social_events_planning'
ON CONFLICT DO NOTHING;