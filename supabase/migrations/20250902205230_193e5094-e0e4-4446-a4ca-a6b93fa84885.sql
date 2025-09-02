-- Grant all major modules to all executive board members
WITH exec_board_emails AS (
  SELECT p.email, p.user_id 
  FROM gw_profiles p
  JOIN gw_executive_board_members eb ON eb.user_id = p.user_id
  WHERE eb.is_active = true
),
all_modules AS (
  SELECT unnest(ARRAY[
    'librarian',
    'student-conductor', 
    'calendar-management',
    'executive-board',
    'auditions',
    'user-management',
    'admin-tools',
    'budgets',
    'contracts',
    'receipts-records',
    'approval-system',
    'glee-ledger',
    'monthly-statements',
    'check-requests',
    'tour-management',
    'booking-forms',
    'service-management',
    'music-library',
    'sight-reading',
    'pr-coordinator',
    'media-library',
    'hero-manager',
    'radio-management',
    'email-management',
    'communications',
    'wellness',
    'merch-store',
    'ai-tools',
    'press-kits',
    'first-year-console'
  ]) AS module_name
)
INSERT INTO public.username_permissions (user_email, module_name, is_active, notes)
SELECT 
  e.email,
  m.module_name,
  true,
  'Executive Board - Full Access'
FROM exec_board_emails e
CROSS JOIN all_modules m
ON CONFLICT (user_email, module_name) 
DO UPDATE SET 
  is_active = true,
  notes = 'Executive Board - Full Access',
  updated_at = now();