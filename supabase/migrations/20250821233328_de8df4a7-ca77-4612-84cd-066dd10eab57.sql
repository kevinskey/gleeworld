-- Create onboarding signatures table
CREATE TABLE IF NOT EXISTS public.onboarding_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  signature_data TEXT NOT NULL, -- Base64 encoded signature image data
  signature_type TEXT NOT NULL DEFAULT 'digital', -- 'digital', 'drawn', etc.
  full_name TEXT NOT NULL,
  date_signed TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  onboarding_step TEXT NOT NULL DEFAULT 'initial_agreement',
  agreement_version TEXT DEFAULT '1.0',
  is_valid BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.onboarding_signatures ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can insert their own onboarding signatures"
ON public.onboarding_signatures
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own onboarding signatures"
ON public.onboarding_signatures
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all onboarding signatures"
ON public.onboarding_signatures
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Admins can manage all onboarding signatures"
ON public.onboarding_signatures
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_onboarding_signatures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_onboarding_signatures_updated_at
  BEFORE UPDATE ON public.onboarding_signatures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_onboarding_signatures_updated_at();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_onboarding_signatures_user_id 
ON public.onboarding_signatures(user_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_signatures_date_signed 
ON public.onboarding_signatures(date_signed);

-- Create function to validate signature data
CREATE OR REPLACE FUNCTION public.validate_signature_data(signature_data TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Basic validation: check if it's a valid base64 data URL
  IF signature_data IS NULL OR LENGTH(signature_data) < 10 THEN
    RETURN FALSE;
  END IF;
  
  -- Check if it starts with data: and contains base64
  IF NOT (signature_data LIKE 'data:%' AND signature_data LIKE '%base64%') THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Add validation constraint
ALTER TABLE public.onboarding_signatures 
ADD CONSTRAINT valid_signature_data 
CHECK (validate_signature_data(signature_data));