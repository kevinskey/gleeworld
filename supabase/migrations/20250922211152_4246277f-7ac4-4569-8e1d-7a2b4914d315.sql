-- Fix QR attendance token RLS policies to allow proper token creation and retrieval

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Admins can create QR tokens" ON qr_attendance_tokens;
DROP POLICY IF EXISTS "Admins can view all QR tokens" ON qr_attendance_tokens;
DROP POLICY IF EXISTS "System can update QR tokens for scans" ON qr_attendance_tokens;

-- Allow admin users to create QR tokens
CREATE POLICY "Admins can create QR tokens" ON qr_attendance_tokens
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE gw_profiles.user_id = auth.uid() 
      AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true OR gw_profiles.is_exec_board = true)
    )
  );

-- Allow admin users and token creators to view QR tokens
CREATE POLICY "Users can view QR tokens" ON qr_attendance_tokens
  FOR SELECT
  USING (
    created_by = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE gw_profiles.user_id = auth.uid() 
      AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true OR gw_profiles.is_exec_board = true)
    )
  );

-- Allow system to update tokens for attendance scanning
CREATE POLICY "System can update QR tokens" ON qr_attendance_tokens
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow anyone to select tokens when scanning (for the scanning process)
CREATE POLICY "Public can read tokens for scanning" ON qr_attendance_tokens
  FOR SELECT
  USING (is_active = true AND expires_at > now());

-- Update the generate_qr_attendance_token function to be more robust
CREATE OR REPLACE FUNCTION public.generate_qr_attendance_token(
  p_event_id UUID,
  p_created_by UUID,
  p_expires_in_minutes INTEGER DEFAULT 30
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Generate a secure random token
  v_token := encode(gen_random_bytes(32), 'base64url');
  
  -- Calculate expiration time
  v_expires_at := now() + (p_expires_in_minutes || ' minutes')::INTERVAL;
  
  -- Insert the token record with proper error handling
  BEGIN
    INSERT INTO qr_attendance_tokens (
      token,
      event_id,
      created_by,
      expires_at,
      is_active
    ) VALUES (
      v_token,
      p_event_id,
      p_created_by,
      v_expires_at,
      true
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create QR token: %', SQLERRM;
  END;
  
  RETURN v_token;
END;
$$;