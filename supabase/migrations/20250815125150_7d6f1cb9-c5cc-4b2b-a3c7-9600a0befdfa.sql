-- Step 1: Update existing schema to support module-based permissions

-- Add key column to gw_modules if it doesn't exist
ALTER TABLE public.gw_modules ADD COLUMN IF NOT EXISTS key TEXT;

-- Create unique index on key column
CREATE UNIQUE INDEX IF NOT EXISTS gw_modules_key_unique ON public.gw_modules(key) WHERE key IS NOT NULL;

-- Update existing modules with proper keys based on names
UPDATE public.gw_modules SET key = CASE 
  WHEN name = 'Budget Management' THEN 'budgets'
  WHEN name = 'Music Library' THEN 'music-library'
  WHEN name = 'Auditions' THEN 'auditions'
  WHEN name = 'Attendance Tracking' THEN 'attendance'
  WHEN name = 'Event Management' THEN 'events'
  WHEN name = 'Communications' THEN 'communications'
  WHEN name = 'PR Coordinator' THEN 'pr-coordinator'
  WHEN name = 'Sight Reading Factory' THEN 'sight-reading'
  WHEN name = 'Executive Board Hub' THEN 'executive-board'
  WHEN name = 'Media Library' THEN 'media-library'
  WHEN name = 'Glee Ledger' THEN 'glee-ledger'
  WHEN name = 'Receipts & Records' THEN 'receipts-records'
  WHEN name = 'Wellness Module' THEN 'wellness'
  WHEN name = 'AI Tools' THEN 'ai-tools'
  WHEN name = 'Press Kits' THEN 'press-kits'
  WHEN name = 'Radio Management' THEN 'radio-management'
  WHEN name = 'Service Management' THEN 'service-management'
  WHEN name = 'Monthly Statements' THEN 'monthly-statements'
  WHEN name = 'Check Requests' THEN 'check-requests'
  WHEN name = 'Tour Management' THEN 'tour-management'
  WHEN name = 'Merchandise Store' THEN 'merch-store'
  WHEN name = 'Hero Image Manager' THEN 'hero-manager'
  WHEN name = 'Student Conductor' THEN 'student-conductor'
  WHEN name = 'Internal Communications' THEN 'internal-communications'
  WHEN name = 'Email Management' THEN 'email'
  WHEN name = 'Public Relations' THEN 'public-relations'
  WHEN name = 'Glee Writing' THEN 'glee-writing'
  ELSE lower(replace(replace(name, ' ', '-'), '&', 'and'))
END
WHERE key IS NULL;

-- Roles master (create if missing)
CREATE TABLE IF NOT EXISTS public.gw_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Per-user overrides (username-based)
CREATE TABLE IF NOT EXISTS public.username_module_permissions (
  user_id UUID NOT NULL,
  module_id UUID NOT NULL REFERENCES public.gw_modules(id) ON DELETE CASCADE,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_manage BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'override',
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

-- Ensure core modules exist with proper keys
INSERT INTO public.gw_modules (name, key, category) VALUES
  ('Budget Management', 'budgets', 'Finance'),
  ('Music Library', 'music-library', 'Music'),
  ('Auditions', 'auditions', 'Administration'),
  ('Attendance Tracking', 'attendance', 'Administration'),
  ('Event Management', 'events', 'Administration'),
  ('Communications', 'communications', 'Administration'),
  ('PR Coordinator', 'pr-coordinator', 'Public Relations'),
  ('Sight Reading Factory', 'sight-reading', 'Music'),
  ('Executive Board Hub', 'executive-board', 'Executive'),
  ('Media Library', 'media-library', 'Media'),
  ('Glee Ledger', 'glee-ledger', 'Finance'),
  ('Receipts & Records', 'receipts-records', 'Finance'),
  ('Wellness Module', 'wellness', 'Student Life'),
  ('AI Tools', 'ai-tools', 'Technology'),
  ('Press Kits', 'press-kits', 'Public Relations'),
  ('Radio Management', 'radio-management', 'Media'),
  ('Service Management', 'service-management', 'Administration'),
  ('Monthly Statements', 'monthly-statements', 'Finance'),
  ('Check Requests', 'check-requests', 'Finance'),
  ('Tour Management', 'tour-management', 'Administration'),
  ('Merchandise Store', 'merch-store', 'Sales'),
  ('Hero Image Manager', 'hero-manager', 'Media'),
  ('Student Conductor', 'student-conductor', 'Music'),
  ('Internal Communications', 'internal-communications', 'Administration'),
  ('Email Management', 'email', 'Communications'),
  ('Public Relations', 'public-relations', 'Public Relations'),
  ('Glee Writing', 'glee-writing', 'Content')
ON CONFLICT (key) DO NOTHING;

-- Create view for user roles
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

-- Effective module permissions view
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