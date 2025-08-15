-- Step 1: Basic schema updates for module-based permissions

-- Add key column to gw_modules if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gw_modules' AND column_name='key') THEN
    ALTER TABLE public.gw_modules ADD COLUMN key TEXT;
  END IF;
END $$;

-- Update existing modules with proper keys based on names
UPDATE public.gw_modules SET key = lower(replace(replace(name, ' ', '-'), '&', 'and'))
WHERE key IS NULL;

-- Create unique index on key column after updating
DROP INDEX IF EXISTS gw_modules_key_unique;
CREATE UNIQUE INDEX gw_modules_key_unique ON public.gw_modules(key);

-- Make key column not null
ALTER TABLE public.gw_modules ALTER COLUMN key SET NOT NULL;

-- Roles master (create if missing)
CREATE TABLE IF NOT EXISTS public.gw_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Per-user module overrides
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

-- Insert default roles
INSERT INTO public.gw_roles (key, name) 
SELECT 'admin', 'Administrator'
WHERE NOT EXISTS (SELECT 1 FROM public.gw_roles WHERE key = 'admin');

INSERT INTO public.gw_roles (key, name) 
SELECT 'super-admin', 'Super Administrator'
WHERE NOT EXISTS (SELECT 1 FROM public.gw_roles WHERE key = 'super-admin');

INSERT INTO public.gw_roles (key, name) 
SELECT 'executive', 'Executive Board'
WHERE NOT EXISTS (SELECT 1 FROM public.gw_roles WHERE key = 'executive');

INSERT INTO public.gw_roles (key, name) 
SELECT 'member', 'Member'
WHERE NOT EXISTS (SELECT 1 FROM public.gw_roles WHERE key = 'member');

INSERT INTO public.gw_roles (key, name) 
SELECT 'alumna', 'Alumna'
WHERE NOT EXISTS (SELECT 1 FROM public.gw_roles WHERE key = 'alumna');

INSERT INTO public.gw_roles (key, name) 
SELECT 'fan', 'Fan'
WHERE NOT EXISTS (SELECT 1 FROM public.gw_roles WHERE key = 'fan');

INSERT INTO public.gw_roles (key, name) 
SELECT 'guest', 'Guest'
WHERE NOT EXISTS (SELECT 1 FROM public.gw_roles WHERE key = 'guest');

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

-- RPC function for clean API access
CREATE OR REPLACE FUNCTION public.get_user_modules(p_user UUID)
RETURNS TABLE(module_key TEXT, module_name TEXT, category TEXT, can_view BOOLEAN, can_manage BOOLEAN)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  WITH role_perms AS (
    SELECT 
      ur.user_id, 
      rmp.module_id,
      bool_or(rmp.can_view) as can_view,
      bool_or(rmp.can_manage) as can_manage
    FROM public.v_user_roles ur
    JOIN public.gw_role_module_permissions rmp ON rmp.role_id = ur.role_id
    WHERE ur.user_id = p_user
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
    bool_or(e.can_view) as can_view, 
    bool_or(e.can_manage) as can_manage
  FROM merged e
  JOIN public.gw_modules m ON m.id = e.module_id
  WHERE m.is_active = true AND e.user_id = p_user
  GROUP BY m.key, m.name, m.category
  ORDER BY m.category, m.name;
$$;

-- Add RLS policies
ALTER TABLE public.username_module_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own module overrides" ON public.username_module_permissions;
CREATE POLICY "Users can read own module overrides"
  ON public.username_module_permissions FOR SELECT
  USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.gw_profiles gp
      WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)
    )
  );

DROP POLICY IF EXISTS "Admins can manage all module overrides" ON public.username_module_permissions;
CREATE POLICY "Admins can manage all module overrides"
  ON public.username_module_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles gp
      WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)
    )
  );