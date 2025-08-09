-- 1) Create role-based module permissions table
CREATE TABLE IF NOT EXISTS public.gw_role_module_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  module_name text NOT NULL,
  permission_type text NOT NULL CHECK (permission_type IN ('view','manage')),
  is_active boolean NOT NULL DEFAULT true,
  granted_by uuid NOT NULL DEFAULT auth.uid(),
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Helpful constraints and indexes
ALTER TABLE public.gw_role_module_permissions
  ADD CONSTRAINT uniq_role_module_perm UNIQUE (role, module_name, permission_type);

CREATE INDEX IF NOT EXISTS idx_gw_role_module_permissions_role_module
  ON public.gw_role_module_permissions (role, module_name);

-- Enable RLS
ALTER TABLE public.gw_role_module_permissions ENABLE ROW LEVEL SECURITY;

-- Policies: only admins/super-admins can manage and read
DROP POLICY IF EXISTS "Admins can select role-module permissions" ON public.gw_role_module_permissions;
CREATE POLICY "Admins can select role-module permissions"
ON public.gw_role_module_permissions
FOR SELECT
USING (public.is_current_user_admin_or_super_admin());

DROP POLICY IF EXISTS "Admins can insert role-module permissions" ON public.gw_role_module_permissions;
CREATE POLICY "Admins can insert role-module permissions"
ON public.gw_role_module_permissions
FOR INSERT
WITH CHECK (public.is_current_user_admin_or_super_admin());

DROP POLICY IF EXISTS "Admins can update role-module permissions" ON public.gw_role_module_permissions;
CREATE POLICY "Admins can update role-module permissions"
ON public.gw_role_module_permissions
FOR UPDATE
USING (public.is_current_user_admin_or_super_admin())
WITH CHECK (public.is_current_user_admin_or_super_admin());

DROP POLICY IF EXISTS "Admins can delete role-module permissions" ON public.gw_role_module_permissions;
CREATE POLICY "Admins can delete role-module permissions"
ON public.gw_role_module_permissions
FOR DELETE
USING (public.is_current_user_admin_or_super_admin());

-- Trigger to maintain updated_at
DROP TRIGGER IF EXISTS update_gw_role_module_permissions_updated_at ON public.gw_role_module_permissions;
CREATE TRIGGER update_gw_role_module_permissions_updated_at
BEFORE UPDATE ON public.gw_role_module_permissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column_v2();

-- 2) Unified RPC to compute effective permissions with precedence
DROP FUNCTION IF EXISTS public.get_user_modules_combined(user_id_param uuid);
CREATE OR REPLACE FUNCTION public.get_user_modules_combined(user_id_param uuid)
RETURNS TABLE(
  module_name text,
  permissions text[],
  can_access boolean,
  can_manage boolean,
  sources text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH user_profile AS (
    SELECT role, is_admin, is_super_admin
    FROM public.gw_profiles
    WHERE user_id = user_id_param
    LIMIT 1
  ),
  base_modules AS (
    SELECT name FROM public.gw_modules WHERE is_active = true
  ),
  admin_all AS (
    SELECT m.name AS module_name, ARRAY['view','manage']::text[] AS permissions, ARRAY['admin']::text[] AS sources
    FROM base_modules m
    WHERE (
      SELECT COALESCE(is_admin, false) OR COALESCE(is_super_admin, false) OR role IN ('admin','super-admin')
      FROM user_profile
    )
  ),
  user_perms AS (
    SELECT m.name AS module_name, ARRAY_AGG(mp.permission_type)::text[] AS permissions, ARRAY['user']::text[] AS sources
    FROM public.gw_module_permissions mp
    JOIN public.gw_modules m ON m.id = mp.module_id
    WHERE mp.user_id = user_id_param
      AND mp.is_active = true
      AND (mp.expires_at IS NULL OR mp.expires_at > now())
      AND m.is_active = true
    GROUP BY m.name
  ),
  role_perms AS (
    SELECT rp.module_name, ARRAY_AGG(rp.permission_type)::text[] AS permissions, ARRAY['role']::text[] AS sources
    FROM public.gw_role_module_permissions rp
    WHERE rp.role = (SELECT role FROM user_profile)
      AND rp.is_active = true
      AND (rp.expires_at IS NULL OR rp.expires_at > now())
    GROUP BY rp.module_name
  ),
  combined AS (
    SELECT * FROM admin_all
    UNION ALL
    SELECT * FROM user_perms
    UNION ALL
    SELECT * FROM role_perms
  ),
  exploded AS (
    SELECT module_name, unnest(permissions) AS perm, unnest(sources) AS src
    FROM combined
  ),
  collapsed AS (
    SELECT 
      module_name,
      ARRAY(SELECT DISTINCT e1.perm FROM exploded e1 WHERE e1.module_name = e.module_name) AS permissions,
      ARRAY(SELECT DISTINCT e2.src  FROM exploded e2 WHERE e2.module_name = e.module_name) AS sources
    FROM exploded e
    GROUP BY module_name
  )
  SELECT 
    c.module_name,
    c.permissions,
    (ARRAY['view','manage'] && c.permissions) AS can_access,
    ('manage' = ANY(c.permissions)) AS can_manage,
    c.sources
  FROM collapsed c
  ORDER BY c.module_name;
$$;