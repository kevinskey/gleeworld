-- Grant Student Conductor module to all Executive Board positions via executive-position functions
WITH sc_func AS (
  SELECT id FROM public.gw_app_functions 
  WHERE module = 'student-conductor' AND is_active = true
  ORDER BY updated_at DESC
  LIMIT 1
),
positions AS (
  -- Use actual positions present in the system
  SELECT DISTINCT position FROM public.gw_executive_board_members
)
INSERT INTO public.gw_executive_position_functions (position, function_id, can_access, can_manage)
SELECT p.position, f.id, true, false
FROM positions p
CROSS JOIN sc_func f
ON CONFLICT (position, function_id)
DO UPDATE SET can_access = true, updated_at = now();
