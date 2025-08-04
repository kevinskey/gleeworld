-- First, drop existing problematic policies on gw_profiles
DROP POLICY IF EXISTS "gw_profiles_delete" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_insert" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_select" ON public.gw_profiles;
DROP POLICY IF EXISTS "gw_profiles_update" ON public.gw_profiles;

-- Create security definer functions to avoid circular references
CREATE OR REPLACE FUNCTION public.is_current_user_admin_safe()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super-admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_super_admin_safe()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'super-admin'
  );
$$;

-- Create new safe RLS policies for gw_profiles
CREATE POLICY "gw_profiles_select_safe" ON public.gw_profiles
FOR SELECT USING (
  user_id = auth.uid() OR public.is_current_user_admin_safe()
);

CREATE POLICY "gw_profiles_insert_safe" ON public.gw_profiles
FOR INSERT WITH CHECK (
  user_id = auth.uid() OR public.is_current_user_admin_safe()
);

CREATE POLICY "gw_profiles_update_safe" ON public.gw_profiles
FOR UPDATE USING (
  user_id = auth.uid() OR public.is_current_user_admin_safe()
);

CREATE POLICY "gw_profiles_delete_safe" ON public.gw_profiles
FOR DELETE USING (
  public.is_current_user_super_admin_safe()
);