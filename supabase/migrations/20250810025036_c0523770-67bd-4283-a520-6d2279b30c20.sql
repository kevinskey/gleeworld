-- Create per-user module order table with RLS (idempotent)
CREATE TABLE IF NOT EXISTS public.gw_user_module_orders (
  user_id uuid PRIMARY KEY,
  module_order text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gw_user_module_orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'gw_user_module_orders' AND policyname = 'Users can view their own module order'
  ) THEN
    CREATE POLICY "Users can view their own module order" ON public.gw_user_module_orders FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'gw_user_module_orders' AND policyname = 'Users can upsert their own module order'
  ) THEN
    CREATE POLICY "Users can upsert their own module order" ON public.gw_user_module_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'gw_user_module_orders' AND policyname = 'Users can update their own module order'
  ) THEN
    CREATE POLICY "Users can update their own module order" ON public.gw_user_module_orders FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'gw_user_module_orders' AND policyname = 'Admins can view all module orders'
  ) THEN
    CREATE POLICY "Admins can view all module orders" ON public.gw_user_module_orders FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.gw_profiles p
        WHERE p.user_id = auth.uid() AND (p.is_admin = true OR p.is_super_admin = true)
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_gw_user_module_orders_updated_at'
  ) THEN
    CREATE TRIGGER update_gw_user_module_orders_updated_at
    BEFORE UPDATE ON public.gw_user_module_orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column_v2();
  END IF;
END $$;