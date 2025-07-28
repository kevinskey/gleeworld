-- Create orders table for Stripe payments
CREATE TABLE IF NOT EXISTS public.gw_user_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id TEXT UNIQUE NOT NULL,
  customer_email TEXT,
  customer_name TEXT,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  shipping_address JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_user_orders ENABLE ROW LEVEL SECURITY;

-- Create policies for orders
CREATE POLICY "Service can create orders" 
ON public.gw_user_orders 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service can read orders" 
ON public.gw_user_orders 
FOR SELECT 
USING (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_orders()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gw_user_orders_updated_at
  BEFORE UPDATE ON public.gw_user_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_orders();