-- Create order items table to track individual products in orders
CREATE TABLE IF NOT EXISTS public.gw_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.gw_user_orders(id) on delete cascade,
  product_id uuid references public.gw_products(id),
  variant_id uuid references public.gw_product_variants(id),
  quantity integer not null default 1,
  unit_price numeric(10,2) not null,
  total_price numeric(10,2) not null,
  product_title text not null,
  variant_title text,
  created_at timestamp with time zone default now()
);

-- Enable RLS on order items
ALTER TABLE public.gw_order_items ENABLE ROW LEVEL SECURITY;

-- Order items policies
CREATE POLICY "Users can view their own order items" ON public.gw_order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.gw_user_orders o 
      WHERE o.id = gw_order_items.order_id 
      AND (o.user_id = auth.uid() OR auth.uid() IS NULL)
    )
  );

CREATE POLICY "Users can insert order items for their orders" ON public.gw_order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gw_user_orders o 
      WHERE o.id = gw_order_items.order_id 
      AND (o.user_id = auth.uid() OR auth.uid() IS NULL)
    )
  );

-- Update user orders table to support guest checkout
ALTER TABLE public.gw_user_orders 
  ALTER COLUMN user_id DROP NOT NULL;

-- Add guest email column for guest checkout
ALTER TABLE public.gw_user_orders 
  ADD COLUMN IF NOT EXISTS guest_email text;

-- Insert some sample products for the store if they don't exist
INSERT INTO public.gw_products (title, description, price, product_type, vendor, tags, inventory_quantity, images, is_active) 
SELECT * FROM (VALUES
('Spelman College Glee Club T-Shirt', 'Classic cotton t-shirt with our iconic logo', 25.00, 'apparel', 'GleeWorld', ARRAY['apparel', 'tshirt', 'merchandise'], 50, ARRAY['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400'], true),
('Concert Recording - Spring 2024', 'Professional recording of our latest spring concert', 15.00, 'digital', 'GleeWorld', ARRAY['music', 'recording', 'digital'], 999, ARRAY['https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400'], true),
('Glee Club Hoodie', 'Warm and comfortable hoodie perfect for Atlanta cooler days', 45.00, 'apparel', 'GleeWorld', ARRAY['apparel', 'hoodie', 'merchandise'], 30, ARRAY['https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400'], true),
('Alumni Collection Polo', 'Professional polo shirt for our distinguished alumni', 35.00, 'apparel', 'GleeWorld', ARRAY['apparel', 'polo', 'alumni'], 25, ARRAY['https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=400'], true),
('Sheet Music Collection', 'Digital sheet music of our most popular arrangements', 10.00, 'digital', 'GleeWorld', ARRAY['music', 'sheet-music', 'digital'], 999, ARRAY['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400'], true),
('Spelman College Glee Club Mug', 'Ceramic mug perfect for your morning coffee', 18.00, 'accessories', 'GleeWorld', ARRAY['accessories', 'mug', 'merchandise'], 75, ARRAY['https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400'], true)
) AS t(title, description, price, product_type, vendor, tags, inventory_quantity, images, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM public.gw_products WHERE title = t.title
);