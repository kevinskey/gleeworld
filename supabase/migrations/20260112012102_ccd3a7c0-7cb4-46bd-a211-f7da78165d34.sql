-- Create orders table for tracking customer purchases
CREATE TABLE public.gw_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  
  -- Order details
  order_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  
  -- Financial
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Stripe integration
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded', 'failed')),
  
  -- Shipping info
  shipping_address JSONB,
  billing_address JSONB,
  requires_shipping BOOLEAN NOT NULL DEFAULT true,
  
  -- EasyPost integration
  easypost_shipment_id TEXT,
  easypost_tracking_code TEXT,
  easypost_label_url TEXT,
  shipping_carrier TEXT,
  shipping_service TEXT,
  estimated_delivery_date TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_orders ENABLE ROW LEVEL SECURITY;

-- Policies for orders (users can view their own orders, admins can view all)
CREATE POLICY "Users can view their own orders"
  ON public.gw_orders
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders"
  ON public.gw_orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.app_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'treasurer')
      AND is_active = true
    )
  );

CREATE POLICY "Admins can update orders"
  ON public.gw_orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.app_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'treasurer')
      AND is_active = true
    )
  );

CREATE POLICY "Allow insert for authenticated or service role"
  ON public.gw_orders
  FOR INSERT
  WITH CHECK (true);

-- Add foreign key to existing gw_order_items table
ALTER TABLE public.gw_order_items
  ADD CONSTRAINT fk_order_items_order
  FOREIGN KEY (order_id) REFERENCES public.gw_orders(id) ON DELETE CASCADE;

-- Add missing columns to gw_order_items
ALTER TABLE public.gw_order_items
  ADD COLUMN IF NOT EXISTS product_type TEXT,
  ADD COLUMN IF NOT EXISTS product_image TEXT,
  ADD COLUMN IF NOT EXISTS requires_shipping BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS weight NUMERIC(10,2);

-- Create indexes for performance
CREATE INDEX idx_gw_orders_user_id ON public.gw_orders(user_id);
CREATE INDEX idx_gw_orders_status ON public.gw_orders(status);
CREATE INDEX idx_gw_orders_order_number ON public.gw_orders(order_number);
CREATE INDEX idx_gw_orders_stripe_session ON public.gw_orders(stripe_session_id);

-- Trigger for updated_at
CREATE TRIGGER update_gw_orders_updated_at
  BEFORE UPDATE ON public.gw_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO counter
  FROM public.gw_orders
  WHERE DATE(created_at) = CURRENT_DATE;
  
  new_number := 'GW-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;