
-- Table for tracking individual student signatures on the shared tour contract
CREATE TABLE public.tour_contract_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts_v2(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  signature_data TEXT NOT NULL,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  signer_ip INET,
  pdf_storage_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(contract_id, user_id)
);

-- Enable RLS
ALTER TABLE public.tour_contract_signatures ENABLE ROW LEVEL SECURITY;

-- Students can view their own signatures
CREATE POLICY "Users can view their own tour contract signatures"
  ON public.tour_contract_signatures FOR SELECT
  USING (auth.uid() = user_id);

-- Students can insert their own signature
CREATE POLICY "Users can sign their own tour contract"
  ON public.tour_contract_signatures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all signatures
CREATE POLICY "Admins can view all tour contract signatures"
  ON public.tour_contract_signatures FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true OR gw_profiles.is_exec_board = true)
  ));

-- Admins can delete signatures if needed
CREATE POLICY "Admins can delete tour contract signatures"
  ON public.tour_contract_signatures FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  ));
