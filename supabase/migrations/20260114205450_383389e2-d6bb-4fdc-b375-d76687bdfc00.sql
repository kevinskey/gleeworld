-- Grant secretary position access to the glee-ledger module
-- This allows the secretary role to view and manage the financial ledger

INSERT INTO public.gw_executive_position_functions (position, function_id, can_access, can_manage)
SELECT 'secretary', id, true, true
FROM public.gw_app_functions 
WHERE name = 'glee-ledger'
ON CONFLICT (position, function_id) DO UPDATE SET 
  can_access = true, 
  can_manage = true, 
  updated_at = now();