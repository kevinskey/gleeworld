-- Enable the pgcrypto extension for gen_random_bytes function
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update the generate_secure_qr_token function to ensure it works properly
CREATE OR REPLACE FUNCTION public.generate_secure_qr_token(event_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  token TEXT;
  timestamp_val BIGINT;
BEGIN
  -- Generate timestamp
  timestamp_val := extract(epoch from now());
  
  -- Generate a more secure token using event ID, timestamp, and random bytes
  token := encode(
    digest(
      event_id_param::text || 
      timestamp_val::text || 
      encode(gen_random_bytes(32), 'hex') || 
      COALESCE(auth.uid()::text, 'anonymous'),
      'sha256'
    ), 
    'base64'
  );
  
  RETURN token;
END;
$$;