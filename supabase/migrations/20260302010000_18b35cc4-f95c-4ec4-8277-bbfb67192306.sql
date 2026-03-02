-- Update INSERT policy to include exec board
DROP POLICY "Admins can insert products" ON public.gw_products;
CREATE POLICY "Admins and exec board can insert products" ON public.gw_products
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM gw_profiles
  WHERE gw_profiles.user_id = auth.uid()
  AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true OR gw_profiles.is_exec_board = true)
));

-- Update UPDATE policy to include exec board
DROP POLICY "Admins can update products" ON public.gw_products;
CREATE POLICY "Admins and exec board can update products" ON public.gw_products
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM gw_profiles
  WHERE gw_profiles.user_id = auth.uid()
  AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true OR gw_profiles.is_exec_board = true)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM gw_profiles
  WHERE gw_profiles.user_id = auth.uid()
  AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true OR gw_profiles.is_exec_board = true)
));

-- Update DELETE policy to include exec board
DROP POLICY "Admins can delete products" ON public.gw_products;
CREATE POLICY "Admins and exec board can delete products" ON public.gw_products
FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM gw_profiles
  WHERE gw_profiles.user_id = auth.uid()
  AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true OR gw_profiles.is_exec_board = true)
));

-- Update SELECT all policy to include exec board
DROP POLICY "Admins can view all products" ON public.gw_products;
CREATE POLICY "Admins and exec board can view all products" ON public.gw_products
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM gw_profiles
  WHERE gw_profiles.user_id = auth.uid()
  AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true OR gw_profiles.is_exec_board = true)
));