
CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  size TEXT NOT NULL,
  sku TEXT,
  price NUMERIC(10,2),
  stock_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read product_variants"
  ON public.product_variants FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert product_variants"
  ON public.product_variants FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update product_variants"
  ON public.product_variants FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated delete product_variants"
  ON public.product_variants FOR DELETE TO authenticated
  USING (true);

CREATE POLICY "Allow anon read product_variants"
  ON public.product_variants FOR SELECT TO anon
  USING (true);
