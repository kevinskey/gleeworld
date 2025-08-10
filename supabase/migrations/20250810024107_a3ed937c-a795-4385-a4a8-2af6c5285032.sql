-- Bulk register all unified module names in gw_modules if missing
DO $$
DECLARE
  mod_names text[] := ARRAY[
    'notifications',
    'email-management',
    'buckets-of-love',
    'glee-writing',
    'internal-communications',
    'pr-coordinator',
    'scheduling-module',
    'service-management',
    'calendar-management',
    'attendance-management',
    'tour-management',
    'booking-forms',
    'user-management',
    'executive-board-management',
    'alumnae-portal',
    'executive-functions',
    'auditions',
    'permissions',
    'wellness',
    'wardrobe',
    'student-conductor',
    'section-leader',
    'sight-singing-management',
    'sight-reading-preview',
    'contracts',
    'budgets',
    'glee-ledger',
    'dues-collection',
    'receipts-records',
    'ai-financial',
    'approval-system',
    'monthly-statements',
    'check-requests',
    'merch-store',
    'music-library',
    'radio-management'
  ];
  v_name text;
BEGIN
  FOREACH v_name IN ARRAY mod_names LOOP
    -- Insert only if missing; leave existing rows untouched
    INSERT INTO public.gw_modules (name, is_active)
    SELECT v_name, true
    WHERE NOT EXISTS (
      SELECT 1 FROM public.gw_modules WHERE name = v_name
    );
  END LOOP;
END $$;