-- Update press_kits RLS policy to work with the new module permission system
DROP POLICY IF EXISTS "Admins and PR coordinators can manage press kits" ON public.press_kits;

-- Create new policy that checks module permissions
CREATE POLICY "Users with press kit permissions can manage press kits"
ON public.press_kits FOR ALL
USING (
  -- Check if user is admin/super admin
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid() 
    AND (p.is_admin = true OR p.is_super_admin = true)
  )
  OR
  -- Check if user has module permissions for press kits
  EXISTS (
    SELECT 1 FROM public.gw_module_permissions mp
    JOIN public.gw_modules m ON m.id = mp.module_id
    WHERE mp.user_id = auth.uid() 
    AND m.key = 'press-kits'
    AND mp.is_active = true
    AND (mp.expires_at IS NULL OR mp.expires_at > now())
    AND mp.permission_type IN ('view', 'manage', 'create', 'edit')
  )
  OR
  -- Legacy check for existing PR coordinators
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid() 
    AND p.exec_board_role = 'pr_coordinator'
  )
);

-- Also update press_kit_items policy to use the same logic
DROP POLICY IF EXISTS "Admins and PR coordinators can manage press kit items" ON public.press_kit_items;

CREATE POLICY "Users with press kit permissions can manage press kit items"
ON public.press_kit_items FOR ALL
USING (
  -- Check if user is admin/super admin
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid() 
    AND (p.is_admin = true OR p.is_super_admin = true)
  )
  OR
  -- Check if user has module permissions for press kits
  EXISTS (
    SELECT 1 FROM public.gw_module_permissions mp
    JOIN public.gw_modules m ON m.id = mp.module_id
    WHERE mp.user_id = auth.uid() 
    AND m.key = 'press-kits'
    AND mp.is_active = true
    AND (mp.expires_at IS NULL OR mp.expires_at > now())
    AND mp.permission_type IN ('view', 'manage', 'create', 'edit')
  )
  OR
  -- Legacy check for existing PR coordinators
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid() 
    AND p.exec_board_role = 'pr_coordinator'
  )
);

-- Update press_kit_shares policy as well
DROP POLICY IF EXISTS "Admins and PR coordinators can manage press kit shares" ON public.press_kit_shares;

CREATE POLICY "Users with press kit permissions can manage press kit shares"
ON public.press_kit_shares FOR ALL
USING (
  -- Check if user is admin/super admin
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid() 
    AND (p.is_admin = true OR p.is_super_admin = true)
  )
  OR
  -- Check if user has module permissions for press kits
  EXISTS (
    SELECT 1 FROM public.gw_module_permissions mp
    JOIN public.gw_modules m ON m.id = mp.module_id
    WHERE mp.user_id = auth.uid() 
    AND m.key = 'press-kits'
    AND mp.is_active = true
    AND (mp.expires_at IS NULL OR mp.expires_at > now())
    AND mp.permission_type IN ('view', 'manage', 'create', 'edit')
  )
  OR
  -- Legacy check for existing PR coordinators
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid() 
    AND p.exec_board_role = 'pr_coordinator'
  )
  OR
  -- Users can manage their own shares
  shared_by = auth.uid()
);