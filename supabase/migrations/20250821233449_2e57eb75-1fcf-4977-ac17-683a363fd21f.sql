-- Check if validation function exists, if not create it
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

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_onboarding_signatures_user_id 
ON public.onboarding_signatures(user_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_signatures_date_signed 
ON public.onboarding_signatures(date_signed);

-- Create function to save onboarding signature with proper validation
CREATE OR REPLACE FUNCTION public.save_onboarding_signature(
  p_signature_data TEXT,
  p_full_name TEXT,
  p_onboarding_step TEXT DEFAULT 'initial_agreement',
  p_signature_type TEXT DEFAULT 'digital',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  signature_id UUID;
BEGIN
  -- Validate input
  IF NOT validate_signature_data(p_signature_data) THEN
    RAISE EXCEPTION 'Invalid signature data format';
  END IF;
  
  IF LENGTH(TRIM(p_full_name)) < 2 THEN
    RAISE EXCEPTION 'Full name must be at least 2 characters';
  END IF;
  
  -- Insert the signature
  INSERT INTO public.onboarding_signatures (
    user_id,
    signature_data,
    full_name,
    onboarding_step,
    signature_type,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    p_signature_data,
    TRIM(p_full_name),
    p_onboarding_step,
    p_signature_type,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO signature_id;
  
  RETURN signature_id;
END;
$$;