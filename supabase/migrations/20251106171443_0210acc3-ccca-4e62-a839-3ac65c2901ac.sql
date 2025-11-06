-- Ensure roles infrastructure and secure RLS for alumnae_global_settings

-- 1) Create enum app_role if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'app_role' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
  END IF;
END$$;

-- 2) Create user_roles table if missing
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- 3) Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4) Create has_role function (security definer, stable, safe search_path)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = _role
  );
$$;

-- 5) User_roles RLS policies (least privilege + bootstrap)
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their user role" ON public.user_roles;
DROP POLICY IF EXISTS "Bootstrap first admin" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their user role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND role = 'user');

-- Allow the first authenticated user to become admin if no admins exist yet
CREATE POLICY "Bootstrap first admin"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role = 'admin'
  AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.role = 'admin')
);

-- Admins can manage roles after bootstrap
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6) Enforce RLS and secure access on alumnae_global_settings
ALTER TABLE public.alumnae_global_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view global settings" ON public.alumnae_global_settings;
DROP POLICY IF EXISTS "Admins can insert global settings" ON public.alumnae_global_settings;
DROP POLICY IF EXISTS "Admins can update global settings" ON public.alumnae_global_settings;
DROP POLICY IF EXISTS "Admins can delete global settings" ON public.alumnae_global_settings;
DROP POLICY IF EXISTS "Bootstrap settings insert when empty" ON public.alumnae_global_settings;

CREATE POLICY "Admins can view global settings"
ON public.alumnae_global_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert global settings"
ON public.alumnae_global_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update global settings"
ON public.alumnae_global_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete global settings"
ON public.alumnae_global_settings
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow first settings row to be created by any authenticated user (bootstrap)
CREATE POLICY "Bootstrap settings insert when empty"
ON public.alumnae_global_settings
FOR INSERT
TO authenticated
WITH CHECK (NOT EXISTS (SELECT 1 FROM public.alumnae_global_settings));
