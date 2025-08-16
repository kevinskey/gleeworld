-- Create app_roles table to avoid RLS recursion
CREATE TABLE IF NOT EXISTS public.app_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'super_admin', 'alumnae_liaison', 'executive_board')),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id, role)
);

-- Enable RLS on app_roles
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer functions to check roles without recursion
CREATE OR REPLACE FUNCTION public.user_has_admin_role(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_roles 
    WHERE user_id = user_id_param 
    AND role IN ('admin', 'super_admin') 
    AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_super_admin_role(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_roles 
    WHERE user_id = user_id_param 
    AND role = 'super_admin' 
    AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_alumnae_liaison_role(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_roles 
    WHERE user_id = user_id_param 
    AND role = 'alumnae_liaison' 
    AND is_active = TRUE
  );
$$;

-- Migration: Copy existing role data from gw_profiles to app_roles
INSERT INTO public.app_roles (user_id, role, is_active)
SELECT user_id, 'admin', TRUE FROM public.gw_profiles WHERE is_admin = TRUE
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.app_roles (user_id, role, is_active)
SELECT user_id, 'super_admin', TRUE FROM public.gw_profiles WHERE is_super_admin = TRUE
ON CONFLICT (user_id, role) DO NOTHING;

-- Drop all existing problematic policies on gw_profiles
DROP POLICY IF EXISTS "gw_profiles_admin_access" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_own_select" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_own_update" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_own_insert" ON public.gw_profiles;
DROP POLICY IF EXISTS "Admin and alumnae liaison profile access" ON public.gw_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.gw_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.gw_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.gw_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.gw_profiles;
DROP POLICY IF EXISTS "Alumnae liaison can view alumnae profiles" ON public.gw_profiles;

-- Create non-recursive policies using the security definer functions
CREATE POLICY "gw_profiles_own_select" 
ON public.gw_profiles 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "gw_profiles_own_update" 
ON public.gw_profiles 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "gw_profiles_own_insert" 
ON public.gw_profiles 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "gw_profiles_admin_manage_all" 
ON public.gw_profiles 
FOR ALL 
USING (public.user_has_admin_role(auth.uid()));

CREATE POLICY "gw_profiles_alumnae_liaison_view" 
ON public.gw_profiles 
FOR SELECT 
USING (
  public.user_has_alumnae_liaison_role(auth.uid()) 
  AND role = 'alumna'
);

-- Create policies for app_roles table
CREATE POLICY "app_roles_admin_manage_all" 
ON public.app_roles 
FOR ALL 
USING (public.user_has_admin_role(auth.uid()));

CREATE POLICY "app_roles_own_view" 
ON public.app_roles 
FOR SELECT 
USING (user_id = auth.uid());