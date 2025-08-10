-- Create per-user module order table with RLS
CREATE TABLE IF NOT EXISTS public.gw_user_module_orders (
  user_id uuid PRIMARY KEY,
  module_order text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_user_module_orders ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY IF NOT EXISTS "Users can view their own module order"
ON public.gw_user_module_orders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can upsert their own module order"
ON public.gw_user_module_orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own module order"
ON public.gw_user_module_orders FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all (optional)
CREATE POLICY IF NOT EXISTS "Admins can view all module orders"
ON public.gw_user_module_orders FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.gw_profiles p
  WHERE p.user_id = auth.uid() AND (p.is_admin = true OR p.is_super_admin = true)
));

-- Update trigger
CREATE TRIGGER update_gw_user_module_orders_updated_at
BEFORE UPDATE ON public.gw_user_module_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column_v2();