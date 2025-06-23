
-- Create a table to store contract signatures with proper workflow states
CREATE TABLE IF NOT EXISTS public.contract_signatures_v2 (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id uuid REFERENCES public.contracts_v2(id) NOT NULL,
  artist_signature_data text,
  admin_signature_data text,
  artist_signed_at timestamp with time zone,
  admin_signed_at timestamp with time zone,
  date_signed text,
  signer_ip inet,
  pdf_storage_path text,
  status text NOT NULL DEFAULT 'pending_artist_signature',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add RLS policies (with IF NOT EXISTS equivalent)
ALTER TABLE public.contract_signatures_v2 ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to ensure they exist correctly
DROP POLICY IF EXISTS "Allow public access for contract signing" ON public.contract_signatures_v2;
CREATE POLICY "Allow public access for contract signing" 
ON public.contract_signatures_v2 
FOR ALL 
USING (true);

-- Create notifications table for admin alerts
CREATE TABLE IF NOT EXISTS public.admin_contract_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id uuid REFERENCES public.contracts_v2(id) NOT NULL,
  signature_id uuid REFERENCES public.contract_signatures_v2(id) NOT NULL,
  admin_email text NOT NULL,
  notification_type text NOT NULL DEFAULT 'contract_ready_for_admin_signature',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add RLS for admin notifications
ALTER TABLE public.admin_contract_notifications ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Allow public access to admin notifications" ON public.admin_contract_notifications;
CREATE POLICY "Allow public access to admin notifications" 
ON public.admin_contract_notifications 
FOR ALL 
USING (true);

-- Skip bucket creation since it already exists
-- Create policy for signed contracts bucket (replace existing)
DROP POLICY IF EXISTS "Allow public access to signed contracts" ON storage.objects;
CREATE POLICY "Allow public access to signed contracts" 
ON storage.objects FOR ALL 
USING (bucket_id = 'signed-contracts');

-- Add trigger to update timestamps (drop first if exists)
DROP TRIGGER IF EXISTS update_contract_signatures_v2_updated_at ON public.contract_signatures_v2;
CREATE TRIGGER update_contract_signatures_v2_updated_at
  BEFORE UPDATE ON public.contract_signatures_v2
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column_v2();
