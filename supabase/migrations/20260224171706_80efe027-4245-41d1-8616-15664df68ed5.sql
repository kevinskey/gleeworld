-- Create bus company table for tour transportation
CREATE TABLE public.gw_tour_bus_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  contract_pdf_url TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_tour_bus_companies ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view
CREATE POLICY "Authenticated users can view bus companies"
ON public.gw_tour_bus_companies
FOR SELECT
USING (auth.role() = 'authenticated');

-- Admins can manage
CREATE POLICY "Admins can insert bus companies"
ON public.gw_tour_bus_companies
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.gw_profiles WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true OR is_exec_board = true))
);

CREATE POLICY "Admins can update bus companies"
ON public.gw_tour_bus_companies
FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.gw_profiles WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true OR is_exec_board = true))
);

CREATE POLICY "Admins can delete bus companies"
ON public.gw_tour_bus_companies
FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.gw_profiles WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true OR is_exec_board = true))
);

-- Create storage bucket for bus contracts
INSERT INTO storage.buckets (id, name, public) VALUES ('tour-contracts', 'tour-contracts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for tour contracts
CREATE POLICY "Authenticated users can view tour contracts"
ON storage.objects FOR SELECT
USING (bucket_id = 'tour-contracts' AND auth.role() = 'authenticated');

CREATE POLICY "Admins can upload tour contracts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tour-contracts' AND
  EXISTS (SELECT 1 FROM public.gw_profiles WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true OR is_exec_board = true))
);

CREATE POLICY "Admins can delete tour contracts"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'tour-contracts' AND
  EXISTS (SELECT 1 FROM public.gw_profiles WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true OR is_exec_board = true))
);