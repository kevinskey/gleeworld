-- Add is_featured column to gw_products table
ALTER TABLE public.gw_products ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

-- Create index for faster featured product queries
CREATE INDEX IF NOT EXISTS idx_gw_products_featured ON public.gw_products(is_featured) WHERE is_featured = true;