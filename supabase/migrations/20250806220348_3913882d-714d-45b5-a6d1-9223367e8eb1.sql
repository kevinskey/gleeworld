-- Activate all modules for executive board positions
-- First, let's ensure all app functions exist and are active
UPDATE public.gw_app_functions SET is_active = true;

-- Now let's add comprehensive permissions for each executive position
-- Tour Manager permissions
INSERT INTO public.gw_executive_position_functions (position, function_id, can_access, can_manage) 
SELECT 'tour_manager', id, true, true
FROM public.gw_app_functions 
WHERE name IN (
  'tour-management', 'booking-forms', 'calendar-management', 'attendance-management',
  'scheduling-module', 'budgets', 'contracts', 'user-management'
)
ON CONFLICT (position, function_id) DO UPDATE SET 
  can_access = true, can_manage = true, updated_at = now();

-- President permissions (all modules)
INSERT INTO public.gw_executive_position_functions (position, function_id, can_access, can_manage)
SELECT 'president', id, true, true
FROM public.gw_app_functions WHERE is_active = true
ON CONFLICT (position, function_id) DO UPDATE SET 
  can_access = true, can_manage = true, updated_at = now();

-- Vice President permissions
INSERT INTO public.gw_executive_position_functions (position, function_id, can_access, can_manage)
SELECT 'vice_president', id, true, true
FROM public.gw_app_functions 
WHERE name IN (
  'user-management', 'executive-board-management', 'scheduling-module', 
  'calendar-management', 'attendance-management', 'internal-communications',
  'notifications', 'email-management'
)
ON CONFLICT (position, function_id) DO UPDATE SET 
  can_access = true, can_manage = true, updated_at = now();

-- Secretary permissions
INSERT INTO public.gw_executive_position_functions (position, function_id, can_access, can_manage)
SELECT 'secretary', id, true, true
FROM public.gw_app_functions 
WHERE name IN (
  'internal-communications', 'email-management', 'notifications', 
  'calendar-management', 'attendance-management', 'user-management'
)
ON CONFLICT (position, function_id) DO UPDATE SET 
  can_access = true, can_manage = true, updated_at = now();

-- Treasurer permissions
INSERT INTO public.gw_executive_position_functions (position, function_id, can_access, can_manage)
SELECT 'treasurer', id, true, true
FROM public.gw_app_functions 
WHERE name IN (
  'budgets', 'glee-ledger', 'dues-collection', 'receipts-records',
  'ai-financial', 'approval-system', 'monthly-statements', 'check-requests'
)
ON CONFLICT (position, function_id) DO UPDATE SET 
  can_access = true, can_manage = true, updated_at = now();

-- Business Manager permissions
INSERT INTO public.gw_executive_position_functions (position, function_id, can_access, can_manage)
SELECT 'business_manager', id, true, true
FROM public.gw_app_functions 
WHERE name IN (
  'contracts', 'booking-forms', 'budgets', 'merch-store',
  'approval-system', 'receipts-records'
)
ON CONFLICT (position, function_id) DO UPDATE SET 
  can_access = true, can_manage = true, updated_at = now();

-- Librarian permissions
INSERT INTO public.gw_executive_position_functions (position, function_id, can_access, can_manage)
SELECT 'librarian', id, true, true
FROM public.gw_app_functions 
WHERE name IN (
  'sight-singing-management', 'sight-reading-preview'
)
ON CONFLICT (position, function_id) DO UPDATE SET 
  can_access = true, can_manage = true, updated_at = now();

-- Student Conductor permissions
INSERT INTO public.gw_executive_position_functions (position, function_id, can_access, can_manage)
SELECT 'student_conductor', id, true, true
FROM public.gw_app_functions 
WHERE name IN (
  'student-conductor', 'attendance-management', 'calendar-management'
)
ON CONFLICT (position, function_id) DO UPDATE SET 
  can_access = true, can_manage = true, updated_at = now();

-- Section Leader permissions
INSERT INTO public.gw_executive_position_functions (position, function_id, can_access, can_manage)
SELECT 'section_leader', id, true, true
FROM public.gw_app_functions 
WHERE name IN (
  'section-leader', 'attendance-management'
)
ON CONFLICT (position, function_id) DO UPDATE SET 
  can_access = true, can_manage = true, updated_at = now();

-- Chaplain permissions
INSERT INTO public.gw_executive_position_functions (position, function_id, can_access, can_manage)
SELECT 'chaplain', id, true, true
FROM public.gw_app_functions 
WHERE name IN (
  'service-management', 'buckets-of-love'
)
ON CONFLICT (position, function_id) DO UPDATE SET 
  can_access = true, can_manage = true, updated_at = now();

-- PR Coordinator permissions
INSERT INTO public.gw_executive_position_functions (position, function_id, can_access, can_manage)
SELECT 'pr_coordinator', id, true, true
FROM public.gw_app_functions 
WHERE name IN (
  'pr-coordinator', 'email-management', 'notifications'
)
ON CONFLICT (position, function_id) DO UPDATE SET 
  can_access = true, can_manage = true, updated_at = now();

-- Glee Writer permissions
INSERT INTO public.gw_executive_position_functions (position, function_id, can_access, can_manage)
SELECT 'glee_writer', id, true, true
FROM public.gw_app_functions 
WHERE name IN (
  'glee-writing', 'notifications'
)
ON CONFLICT (position, function_id) DO UPDATE SET 
  can_access = true, can_manage = true, updated_at = now();

-- Radio Manager permissions
INSERT INTO public.gw_executive_position_functions (position, function_id, can_access, can_manage)
SELECT 'radio_manager', id, true, true
FROM public.gw_app_functions 
WHERE name IN (
  'radio-management'
)
ON CONFLICT (position, function_id) DO UPDATE SET 
  can_access = true, can_manage = true, updated_at = now();