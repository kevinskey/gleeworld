-- Fix missing INSERT policy for gw_role_module_permissions
DROP POLICY IF EXISTS "Admins can insert role-module permissions" ON public.gw_role_module_permissions;

CREATE POLICY "Admins can insert role-module permissions" 
ON public.gw_role_module_permissions 
FOR INSERT 
WITH CHECK (is_current_user_admin_or_super_admin());

-- Ensure the admin check function is working properly
CREATE OR REPLACE FUNCTION public.is_current_user_admin_or_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  );
$$;

-- Also add a policy for role permissions updates to support upserts better
DROP POLICY IF EXISTS "Admins can upsert role-module permissions" ON public.gw_role_module_permissions;

CREATE POLICY "Admins can upsert role-module permissions" 
ON public.gw_role_module_permissions 
FOR ALL 
USING (is_current_user_admin_or_super_admin())
WITH CHECK (is_current_user_admin_or_super_admin());