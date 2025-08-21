
-- 1) Seed essential modules (idempotent upsert)
-- Assumes a unique constraint on gw_modules.key. If not present, this will still be safe for existing rows.
INSERT INTO public.gw_modules (key, name, description, category, is_active, created_at, updated_at)
VALUES
  ('notifications', 'notifications', 'Manage system notifications and alerts', 'communications', true, now(), now()),
  ('email-management', 'email-management', 'Configure and send emails to members', 'communications', true, now(), now()),
  ('internal-communications', 'internal-communications', 'Internal messaging and announcements', 'communications', true, now(), now()),
  ('pr-coordinator', 'pr-coordinator', 'Public relations, social media management, and press releases', 'communications', true, now(), now()),
  ('scheduling-module', 'scheduling-module', 'Schedule and manage rehearsals and events', 'communications', true, now(), now()),
  ('service-management', 'service-management', 'Manage scheduler services, badges, and booking settings', 'communications', true, now(), now()),
  ('calendar-management', 'calendar-management', 'Schedule events, block dates, and manage appointments', 'communications', true, now(), now()),
  ('attendance-management', 'attendance-management', 'Track attendance, manage QR codes, process excuses, and generate reports', 'attendance', true, now(), now()),
  ('tour-management', 'tour-management', 'Comprehensive tour planning, logistics, and management system', 'tours', true, now(), now()),
  ('booking-forms', 'booking-forms', 'Manage performance requests and booking inquiries', 'tours', true, now(), now()),
  ('user-management', 'user-management', 'Manage user accounts, roles, and permissions', 'member-management', true, now(), now()),
  ('executive-board-management', 'executive-board-management', 'Manage executive board positions and assignments', 'member-management', true, now(), now()),
  ('executive-functions', 'executive-functions', 'Role-specific executive board functions', 'member-management', true, now(), now()),
  ('auditions', 'auditions', 'Manage audition sessions, applications, and evaluations', 'member-management', true, now(), now()),
  ('permissions', 'permissions', 'Configure user roles, permissions, and access controls', 'member-management', true, now(), now()),
  ('wellness', 'wellness', 'Wellness & mental health tools for members', 'member-management', true, now(), now()),
  ('wardrobe', 'wardrobe', 'Manage costumes, fittings, and inventory', 'member-management', true, now(), now()),
  ('student-conductor', 'student-conductor', 'Student conductor and sectional coordination', 'musical-leadership', true, now(), now()),
  ('section-leader', 'section-leader', 'Manage section rosters and setlists', 'musical-leadership', true, now(), now()),
  ('sight-singing-management', 'sight-singing-management', 'Manage sight singing exercises and tracking', 'musical-leadership', true, now(), now()),
  ('contracts', 'contracts', 'Create and manage contracts', 'finances', true, now(), now()),
  ('budgets', 'budgets', 'Financial planning and budget management', 'finances', true, now(), now()),
  ('glee-ledger', 'glee-ledger', 'Financial ledger (Google Sheets integration)', 'finances', true, now(), now()),
  ('dues-collection', 'dues-collection', 'Collect and track member dues', 'finances', true, now(), now()),
  ('receipts-records', 'receipts-records', 'Upload and manage receipts and financial records', 'finances', true, now(), now()),
  ('approval-system', 'approval-system', 'Financial approval workflows', 'finances', true, now(), now()),
  ('monthly-statements', 'monthly-statements', 'Generate monthly statements', 'finances', true, now(), now()),
  ('check-requests', 'check-requests', 'Process and track reimbursements', 'finances', true, now(), now()),
  ('merch-store', 'merch-store', 'Manage merchandise sales and inventory', 'finances', true, now(), now()),
  ('music-library', 'music-library', 'Manage sheet music, recordings, and resources', 'libraries', true, now(), now()),
  ('radio-management', 'radio-management', 'Manage Glee World Radio station', 'libraries', true, now(), now()),
  ('media-library', 'media-library', 'Manage images, audio, videos, and documents', 'libraries', true, now(), now()),
  ('karaoke', 'karaoke', 'Record over backing tracks and save mixes', 'libraries', true, now(), now()),
  ('librarian', 'librarian', 'Music Librarian tools', 'libraries', true, now(), now()),
  ('fan-engagement', 'fan-engagement', 'Manage fan community and posts', 'communications', true, now(), now()),
  ('ai-financial', 'ai-financial', 'AI-powered financial insights', 'finances', true, now(), now()),
  ('member-sight-reading-studio', 'member-sight-reading-studio', 'Student sight reading portal', 'musical-leadership', true, now(), now()),
  ('buckets-of-love', 'buckets-of-love', 'Community support and encouragement', 'communications', true, now(), now()),
  ('glee-writing', 'glee-writing', 'Content creation and writing tools', 'communications', true, now(), now())
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = COALESCE(EXCLUDED.description, public.gw_modules.description),
  category = EXCLUDED.category,
  is_active = true,
  updated_at = now();

-- 2) Executive board group assignments for essential modules (idempotent)
-- Give 'executive_board' group VIEW access to key modules
INSERT INTO public.gw_module_assignments (module_id, assignment_type, assigned_to_group, permissions, is_active, created_at, updated_at)
SELECT m.id, 'group', 'executive_board', ARRAY['view'], true, now(), now()
FROM public.gw_modules m
WHERE m.key IN (
  'user-management',
  'executive-board-management',
  'executive-functions',
  'calendar-management',
  'attendance-management',
  'tour-management',
  'contracts',
  'budgets',
  'receipts-records',
  'permissions',
  'notifications',
  'email-management',
  'internal-communications',
  'service-management',
  'music-library'
)
AND NOT EXISTS (
  SELECT 1 FROM public.gw_module_assignments a
  WHERE a.module_id = m.id
    AND a.assignment_type = 'group'
    AND a.assigned_to_group = 'executive_board'
    AND a.is_active = true
);

-- 3) Admin group assignments (universal manage) (idempotent)
INSERT INTO public.gw_module_assignments (module_id, assignment_type, assigned_to_group, permissions, is_active, created_at, updated_at)
SELECT m.id, 'group', 'admin', ARRAY['view','manage'], true, now(), now()
FROM public.gw_modules m
WHERE NOT EXISTS (
  SELECT 1 FROM public.gw_module_assignments a
  WHERE a.module_id = m.id
    AND a.assignment_type = 'group'
    AND a.assigned_to_group = 'admin'
    AND a.is_active = true
);

-- 4) Ensure the get_user_modules RPC exists and accounts for direct, individual, group, and admin permissions
CREATE OR REPLACE FUNCTION public.get_user_modules(p_user uuid)
RETURNS TABLE(
  module_key text,
  module_name text,
  category text,
  can_view boolean,
  can_manage boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH user_profile AS (
    SELECT role, is_admin, is_super_admin, is_exec_board
    FROM public.gw_profiles
    WHERE user_id = p_user
    LIMIT 1
  ),
  direct_permissions AS (
    SELECT 
      m.key as module_key,
      m.name as module_name,
      m.category,
      bool_or(gmp.permission_type = 'view' OR gmp.permission_type = 'manage') as can_view,
      bool_or(gmp.permission_type = 'manage') as can_manage
    FROM public.gw_modules m
    JOIN public.gw_module_permissions gmp ON gmp.module_id = m.id
    WHERE gmp.user_id = p_user 
      AND gmp.is_active = true
      AND (gmp.expires_at IS NULL OR gmp.expires_at > now())
      AND m.is_active = true
    GROUP BY m.key, m.name, m.category
  ),
  individual_assignments AS (
    SELECT 
      m.key as module_key,
      m.name as module_name,
      m.category,
      ('view' = ANY(gma.permissions) OR 'manage' = ANY(gma.permissions)) as can_view,
      ('manage' = ANY(gma.permissions)) as can_manage
    FROM public.gw_modules m
    JOIN public.gw_module_assignments gma ON gma.module_id = m.id
    WHERE gma.assigned_to_user_id = p_user
      AND gma.assignment_type = 'individual'
      AND gma.is_active = true
      AND (gma.expires_at IS NULL OR gma.expires_at > now())
      AND m.is_active = true
  ),
  group_assignments AS (
    SELECT 
      m.key as module_key,
      m.name as module_name,
      m.category,
      ('view' = ANY(gma.permissions) OR 'manage' = ANY(gma.permissions)) as can_view,
      ('manage' = ANY(gma.permissions)) as can_manage
    FROM public.gw_modules m
    JOIN public.gw_module_assignments gma ON gma.module_id = m.id
    CROSS JOIN user_profile up
    WHERE gma.assignment_type = 'group'
      AND gma.is_active = true
      AND (gma.expires_at IS NULL OR gma.expires_at > now())
      AND m.is_active = true
      AND (
        gma.assigned_to_group = 'all' OR
        (gma.assigned_to_group = 'executive_board' AND up.is_exec_board = true) OR
        (gma.assigned_to_group = 'admin' AND (up.is_admin = true OR up.is_super_admin = true)) OR
        (gma.assigned_to_group = up.role)
      )
  ),
  admin_permissions AS (
    SELECT 
      m.key as module_key,
      m.name as module_name,
      m.category,
      true as can_view,
      true as can_manage
    FROM public.gw_modules m
    CROSS JOIN user_profile up
    WHERE m.is_active = true
      AND (up.is_admin = true OR up.is_super_admin = true)
  ),
  all_permissions AS (
    SELECT * FROM direct_permissions
    UNION ALL
    SELECT * FROM individual_assignments  
    UNION ALL
    SELECT * FROM group_assignments
    UNION ALL
    SELECT * FROM admin_permissions
  )
  SELECT 
    ap.module_key,
    ap.module_name,
    ap.category,
    bool_or(ap.can_view) as can_view,
    bool_or(ap.can_manage) as can_manage
  FROM all_permissions ap
  GROUP BY ap.module_key, ap.module_name, ap.category
  ORDER BY ap.category, ap.module_name;
$$;
