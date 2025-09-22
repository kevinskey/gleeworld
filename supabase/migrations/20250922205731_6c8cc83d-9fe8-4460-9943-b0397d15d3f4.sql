-- Enable pgcrypto extension for gen_random_bytes function
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create or replace function to generate QR attendance tokens
CREATE OR REPLACE FUNCTION generate_qr_attendance_token(
  p_event_id UUID,
  p_created_by UUID,
  p_expires_in_minutes INTEGER DEFAULT 60
) RETURNS TEXT AS $$
DECLARE
  token TEXT;
  expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Generate a random token
  token := encode(gen_random_bytes(32), 'base64');
  -- Remove URL-unsafe characters
  token := replace(replace(replace(token, '+', '-'), '/', '_'), '=', '');
  
  -- Calculate expiration time
  expires_at := NOW() + (p_expires_in_minutes || ' minutes')::INTERVAL;
  
  -- Insert the token record (only if table exists)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'gw_attendance_qr_tokens') THEN
    INSERT INTO gw_attendance_qr_tokens (
      token,
      event_id,
      created_by,
      expires_at,
      is_active
    ) VALUES (
      token,
      p_event_id,
      p_created_by,
      expires_at,
      true
    );
  END IF;
  
  RETURN token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;