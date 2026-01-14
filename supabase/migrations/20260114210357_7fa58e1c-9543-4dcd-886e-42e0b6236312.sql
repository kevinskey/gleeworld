-- Add course-attendance-ledger to app functions
INSERT INTO public.gw_app_functions (name, description, category)
VALUES ('course-attendance-ledger', 'Track attendance records by course and semester', 'attendance')
ON CONFLICT (name) DO NOTHING;

-- Grant secretary access to course-attendance-ledger
INSERT INTO public.gw_executive_position_functions (position, function_id, can_access, can_manage)
SELECT 'secretary', id, true, true
FROM public.gw_app_functions 
WHERE name = 'course-attendance-ledger'
ON CONFLICT (position, function_id) DO UPDATE SET 
  can_access = true, 
  can_manage = true, 
  updated_at = now();