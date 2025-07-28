-- Add DELETE policy for gw_products table to allow admins to delete products
CREATE POLICY "Admins can delete products" ON public.gw_products
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );