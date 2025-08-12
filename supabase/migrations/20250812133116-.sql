-- Fix RLS policies for module permissions system

-- Add missing INSERT/UPDATE policies for gw_module_permissions
CREATE POLICY "Admins can insert module permissions for users"
ON public.gw_module_permissions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Admins can update module permissions"
ON public.gw_module_permissions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Admins can delete module permissions"
ON public.gw_module_permissions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Add constraint to ensure valid permission types
ALTER TABLE public.gw_module_permissions 
ADD CONSTRAINT valid_permission_type 
CHECK (permission_type IN ('view', 'manage', 'edit', 'create', 'delete'));

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_module_permissions_user_module 
ON public.gw_module_permissions (user_id, module_id);

CREATE INDEX IF NOT EXISTS idx_module_permissions_active 
ON public.gw_module_permissions (is_active) WHERE is_active = true;