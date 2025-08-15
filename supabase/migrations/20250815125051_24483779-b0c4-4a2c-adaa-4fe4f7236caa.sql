-- Step 1: Create missing tables and schema updates for module-based permissions

-- Modules master (keep if exists)
CREATE TABLE IF NOT EXISTS public.gw_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,        -- e.g. 'budgets', 'music-library'
  name TEXT NOT NULL,
  category TEXT NOT NULL,          -- e.g. 'Finance', 'Music'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Roles master (create if missing)
CREATE TABLE IF NOT EXISTS public.gw_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,        -- e.g. 'admin','executive','member','guest'
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Role → Module permissions (keep if exists)
CREATE TABLE IF NOT EXISTS public.gw_role_module_permissions (
  role_id UUID REFERENCES public.gw_roles(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.gw_modules(id) ON DELETE CASCADE,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_manage BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, module_id)
);

-- Per-user overrides (username-based)
CREATE TABLE IF NOT EXISTS public.username_module_permissions (
  user_id UUID NOT NULL,
  module_id UUID NOT NULL REFERENCES public.gw_modules(id) ON DELETE CASCADE,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_manage BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'override', -- audit trail
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  PRIMARY KEY (user_id, module_id)
);

-- Insert default roles if they don't exist
INSERT INTO public.gw_roles (key, name) VALUES
  ('admin', 'Administrator'),
  ('super-admin', 'Super Administrator'),
  ('executive', 'Executive Board'),
  ('member', 'Member'),
  ('alumna', 'Alumna'),
  ('fan', 'Fan'),
  ('guest', 'Guest')
ON CONFLICT (key) DO NOTHING;

-- Ensure core modules exist with proper categorization
INSERT INTO public.gw_modules (key, name, category) VALUES
  ('budgets', 'Budget Management', 'Finance'),
  ('music-library', 'Music Library', 'Music'),
  ('auditions', 'Auditions', 'Administration'),
  ('attendance', 'Attendance Tracking', 'Administration'),
  ('events', 'Event Management', 'Administration'),
  ('communications', 'Communications', 'Administration'),
  ('pr-coordinator', 'PR Coordinator', 'Public Relations'),
  ('sight-reading', 'Sight Reading Factory', 'Music'),
  ('executive-board', 'Executive Board Hub', 'Executive'),
  ('media-library', 'Media Library', 'Media'),
  ('glee-ledger', 'Glee Ledger', 'Finance'),
  ('receipts-records', 'Receipts & Records', 'Finance'),
  ('wellness', 'Wellness Module', 'Student Life'),
  ('ai-tools', 'AI Tools', 'Technology'),
  ('press-kits', 'Press Kits', 'Public Relations'),
  ('radio-management', 'Radio Management', 'Media'),
  ('service-management', 'Service Management', 'Administration'),
  ('monthly-statements', 'Monthly Statements', 'Finance'),
  ('check-requests', 'Check Requests', 'Finance'),
  ('tour-management', 'Tour Management', 'Administration'),
  ('merch-store', 'Merchandise Store', 'Sales'),
  ('hero-manager', 'Hero Image Manager', 'Media'),
  ('student-conductor', 'Student Conductor', 'Music'),
  ('internal-communications', 'Internal Communications', 'Administration'),
  ('email', 'Email Management', 'Communications'),
  ('public-relations', 'Public Relations', 'Public Relations'),
  ('glee-writing', 'Glee Writing', 'Content')
ON CONFLICT (key) DO NOTHING;

-- Create view for user roles (adapt to existing user role structure)
CREATE OR REPLACE VIEW public.v_user_roles AS
SELECT 
  gp.user_id,
  gr.id as role_id,
  gr.key as role_key
FROM public.gw_profiles gp
JOIN public.gw_roles gr ON gr.key = gp.role
WHERE gp.role IS NOT NULL

UNION

-- Include executive board members with executive role
SELECT 
  ebm.user_id,
  gr.id as role_id,
  gr.key as role_key
FROM public.gw_executive_board_members ebm
JOIN public.gw_roles gr ON gr.key = 'executive'
WHERE ebm.is_active = true;

-- Effective module permissions = role union override
CREATE OR REPLACE VIEW public.v_user_effective_module_perms AS
WITH role_perms AS (
  SELECT 
    ur.user_id, 
    rmp.module_id,
    bool_or(rmp.can_view) as can_view,
    bool_or(rmp.can_manage) as can_manage
  FROM public.v_user_roles ur
  JOIN public.gw_role_module_permissions rmp ON rmp.role_id = ur.role_id
  GROUP BY ur.user_id, rmp.module_id
),
merged AS (
  SELECT
    COALESCE(ump.user_id, rp.user_id) as user_id,
    COALESCE(ump.module_id, rp.module_id) as module_id,
    COALESCE(ump.can_view, rp.can_view, false) as can_view,
    COALESCE(ump.can_manage, rp.can_manage, false) as can_manage
  FROM role_perms rp
  FULL OUTER JOIN public.username_module_permissions ump
    ON rp.user_id = ump.user_id 
    AND rp.module_id = ump.module_id 
    AND ump.is_active = true
    AND (ump.expires_at IS NULL OR ump.expires_at > now())
)
SELECT 
  m.key as module_key, 
  m.name as module_name, 
  m.category,
  e.user_id, 
  e.can_view, 
  e.can_manage
FROM merged e
JOIN public.gw_modules m ON m.id = e.module_id
WHERE m.is_active = true;

-- RPC function for clean API access
CREATE OR REPLACE FUNCTION public.get_user_modules(p_user UUID)
RETURNS TABLE(module_key TEXT, module_name TEXT, category TEXT, can_view BOOLEAN, can_manage BOOLEAN)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    v.module_key, 
    v.module_name, 
    v.category,
    bool_or(v.can_view) as can_view, 
    bool_or(v.can_manage) as can_manage
  FROM public.v_user_effective_module_perms v
  WHERE v.user_id = p_user
  GROUP BY v.module_key, v.module_name, v.category
  ORDER BY v.category, v.module_name;
$$;

-- Migration: Convert existing username_permissions to module-based
-- Create temporary mapping table
CREATE TEMP TABLE tmp_perm_to_module (
  legacy_key TEXT PRIMARY KEY,
  module_key TEXT NOT NULL
);

INSERT INTO tmp_perm_to_module (legacy_key, module_key) VALUES
  ('access_budget_creation', 'budgets'),
  ('access_budget_read', 'budgets'),
  ('access_budget_manage', 'budgets'),
  ('access_music_upload', 'music-library'),
  ('access_music_library', 'music-library'),
  ('access_auditions_manage', 'auditions'),
  ('access_auditions_view', 'auditions'),
  ('access_attendance_manage', 'attendance'),
  ('access_events_manage', 'events'),
  ('access_communications', 'communications'),
  ('access_hero_management', 'hero-manager'),
  ('send_emails', 'email'),
  ('manage_pr', 'public-relations'),
  ('sight_reading_access', 'sight-reading');

-- Convert existing username_permissions to username_module_permissions
INSERT INTO public.username_module_permissions (user_id, module_id, can_view, can_manage, source, notes)
SELECT 
  (SELECT user_id FROM public.gw_profiles WHERE email = up.user_email LIMIT 1) as user_id,
  m.id as module_id,
  true as can_view,
  CASE 
    WHEN t.legacy_key ~ '(manage|create|edit|delete)' THEN true 
    ELSE false 
  END as can_manage,
  'migration' as source,
  'Migrated from legacy permission: ' || up.module_name as notes
FROM public.username_permissions up
JOIN tmp_perm_to_module t ON t.legacy_key = up.module_name
JOIN public.gw_modules m ON m.key = t.module_key
WHERE up.is_active = true
  AND (up.expires_at IS NULL OR up.expires_at > now())
  AND NOT EXISTS (
    SELECT 1 FROM public.username_module_permissions ump 
    WHERE ump.user_id = (SELECT user_id FROM public.gw_profiles WHERE email = up.user_email LIMIT 1)
    AND ump.module_id = m.id
  );

-- Add RLS policies
ALTER TABLE public.username_module_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own module overrides"
  ON public.username_module_permissions FOR SELECT
  USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.v_user_roles vr
      JOIN public.gw_roles r ON r.id = vr.role_id
      WHERE vr.user_id = auth.uid() AND r.key IN ('admin', 'super-admin')
    )
  );

CREATE POLICY "Admins can manage all module overrides"
  ON public.username_module_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.v_user_roles vr
      JOIN public.gw_roles r ON r.id = vr.role_id
      WHERE vr.user_id = auth.uid() AND r.key IN ('admin', 'super-admin')
    )
  );

-- Enable RLS on role module permissions
ALTER TABLE public.gw_role_module_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage role module permissions"
  ON public.gw_role_module_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.v_user_roles vr
      JOIN public.gw_roles r ON r.id = vr.role_id
      WHERE vr.user_id = auth.uid() AND r.key IN ('admin', 'super-admin')
    )
  );

CREATE POLICY "Anyone can read role module permissions"
  ON public.gw_role_module_permissions FOR SELECT
  USING (true);

-- Add update trigger for username_module_permissions
CREATE OR REPLACE FUNCTION public.update_username_module_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.granted_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_username_module_permissions_updated_at
  BEFORE UPDATE ON public.username_module_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_username_module_permissions_updated_at();