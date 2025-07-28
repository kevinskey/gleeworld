-- Create Square integration tables
CREATE TABLE public.square_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  application_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  environment TEXT NOT NULL DEFAULT 'sandbox',
  webhook_signature_key TEXT,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_sync_interval_hours INTEGER NOT NULL DEFAULT 24,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Square product mappings table
CREATE TABLE public.square_product_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES public.square_integrations(id) ON DELETE CASCADE,
  local_product_id UUID NOT NULL REFERENCES public.gw_products(id) ON DELETE CASCADE,
  square_catalog_object_id TEXT NOT NULL,
  square_item_variation_id TEXT,
  last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(integration_id, square_catalog_object_id)
);

-- Create Square sync logs table
CREATE TABLE public.square_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES public.square_integrations(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL, -- 'products', 'inventory', 'orders'
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed'
  items_processed INTEGER NOT NULL DEFAULT 0,
  items_created INTEGER NOT NULL DEFAULT 0,
  items_updated INTEGER NOT NULL DEFAULT 0,
  items_failed INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.square_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.square_product_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.square_sync_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for square_integrations
CREATE POLICY "Users can manage their own Square integrations" ON public.square_integrations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all Square integrations" ON public.square_integrations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Create RLS policies for square_product_mappings
CREATE POLICY "Users can manage mappings for their integrations" ON public.square_product_mappings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.square_integrations 
      WHERE id = square_product_mappings.integration_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all product mappings" ON public.square_product_mappings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Create RLS policies for square_sync_logs
CREATE POLICY "Users can view sync logs for their integrations" ON public.square_sync_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.square_integrations 
      WHERE id = square_sync_logs.integration_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all sync logs" ON public.square_sync_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Create update triggers
CREATE TRIGGER update_square_integrations_updated_at
  BEFORE UPDATE ON public.square_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to encrypt/decrypt tokens (basic implementation)
CREATE OR REPLACE FUNCTION public.encrypt_square_token(token TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- In production, you'd use proper encryption
  -- For now, we'll store tokens as-is but this function provides the structure
  RETURN token;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_square_token(encrypted_token TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- In production, you'd use proper decryption
  -- For now, we'll return tokens as-is but this function provides the structure
  RETURN encrypted_token;
END;
$$;