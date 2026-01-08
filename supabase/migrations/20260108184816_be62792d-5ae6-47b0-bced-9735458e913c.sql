-- Create a separate table for Amazon affiliate products
CREATE TABLE public.amazon_affiliate_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  product_url TEXT NOT NULL,
  price TEXT,
  asin TEXT,
  category TEXT,
  affiliate_tag TEXT DEFAULT 'kevinskey-20',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.amazon_affiliate_products ENABLE ROW LEVEL SECURITY;

-- Public read access for displaying products anywhere
CREATE POLICY "Anyone can view active Amazon products"
ON public.amazon_affiliate_products
FOR SELECT
USING (is_active = true);

-- Admin/authenticated users can manage products
CREATE POLICY "Authenticated users can insert Amazon products"
ON public.amazon_affiliate_products
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update Amazon products"
ON public.amazon_affiliate_products
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete Amazon products"
ON public.amazon_affiliate_products
FOR DELETE
TO authenticated
USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_amazon_affiliate_products_updated_at
BEFORE UPDATE ON public.amazon_affiliate_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();