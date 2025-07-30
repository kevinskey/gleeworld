-- Fix the generate_secure_qr_token function to use the correct schema for gen_random_bytes
CREATE OR REPLACE FUNCTION public.generate_secure_qr_token(event_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
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
      encode(extensions.gen_random_bytes(32), 'hex') || 
      COALESCE(auth.uid()::text, 'anonymous'),
      'sha256'
    ), 
    'base64'
  );
  
  RETURN token;
END;
$$;