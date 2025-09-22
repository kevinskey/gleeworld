-- Enable pgcrypto extension for gen_random_bytes function
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create function to generate QR attendance tokens
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
  
  -- Insert the token record
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
  
  RETURN token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create table for QR attendance tokens if it doesn't exist
CREATE TABLE IF NOT EXISTS gw_attendance_qr_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  event_id UUID REFERENCES gw_events(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on the tokens table
ALTER TABLE gw_attendance_qr_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies for QR tokens
CREATE POLICY "Users can view QR tokens they created" 
ON gw_attendance_qr_tokens 
FOR SELECT 
USING (auth.uid() = created_by);

CREATE POLICY "Users can create QR tokens" 
ON gw_attendance_qr_tokens 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their QR tokens" 
ON gw_attendance_qr_tokens 
FOR UPDATE 
USING (auth.uid() = created_by);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_attendance_qr_tokens_token ON gw_attendance_qr_tokens(token);
CREATE INDEX IF NOT EXISTS idx_attendance_qr_tokens_event_id ON gw_attendance_qr_tokens(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_qr_tokens_expires_at ON gw_attendance_qr_tokens(expires_at);