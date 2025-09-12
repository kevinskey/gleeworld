-- Create function to generate QR attendance tokens (only if it doesn't exist)
CREATE OR REPLACE FUNCTION public.generate_qr_attendance_token(
  p_event_id UUID,
  p_created_by UUID,
  p_expires_in_minutes INTEGER DEFAULT 30
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Check permissions
  IF NOT EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR is_exec_board = true)
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to generate QR tokens';
  END IF;

  -- Generate unique token
  v_token := encode(gen_random_bytes(32), 'base64url');
  v_expires_at := now() + (p_expires_in_minutes || ' minutes')::INTERVAL;

  -- Deactivate any existing active tokens for this event
  UPDATE qr_attendance_tokens 
  SET is_active = false 
  WHERE event_id = p_event_id AND is_active = true;

  -- Insert new token
  INSERT INTO qr_attendance_tokens (
    token, event_id, created_by, expires_at
  ) VALUES (
    v_token, p_event_id, p_created_by, v_expires_at
  );

  RETURN v_token;
END;
$$;