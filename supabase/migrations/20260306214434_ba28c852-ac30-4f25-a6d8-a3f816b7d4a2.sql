-- Allow authenticated users to insert product variants
CREATE POLICY "Authenticated users can insert product variants"
  ON public.gw_product_variants FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update product variants
CREATE POLICY "Authenticated users can update product variants"
  ON public.gw_product_variants FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete product variants
CREATE POLICY "Authenticated users can delete product variants"
  ON public.gw_product_variants FOR DELETE
  TO authenticated
  USING (true);