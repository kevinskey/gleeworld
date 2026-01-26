-- Fix generate_session_qr_code to use URL-safe base64 tokens
CREATE OR REPLACE FUNCTION public.generate_session_qr_code(
  p_session_id uuid,
  p_generated_by uuid,
  p_expires_in_minutes integer DEFAULT 2
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qr_token text;
  v_expires_at timestamptz;
  v_qr_id uuid;
  v_session_course_id uuid;
BEGIN
  -- Get the course_id from the session
  SELECT course_id INTO v_session_course_id
  FROM gw_attendance_sessions
  WHERE id = p_session_id;
  
  IF v_session_course_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session not found');
  END IF;

  -- Generate URL-safe token (replace + with -, / with _, remove = padding)
  v_qr_token := encode(extensions.gen_random_bytes(32), 'base64');
  v_qr_token := replace(replace(v_qr_token, '+', '-'), '/', '_');
  v_qr_token := rtrim(v_qr_token, '=');
  
  v_expires_at := now() + (p_expires_in_minutes || ' minutes')::interval;
  
  -- Deactivate any existing active QR codes for this session
  UPDATE gw_attendance_qr_codes
  SET is_active = false, updated_at = now()
  WHERE attendance_session_id = p_session_id AND is_active = true;
  
  -- Insert new QR code
  INSERT INTO gw_attendance_qr_codes (
    qr_token,
    attendance_session_id,
    course_id,
    generated_by,
    expires_at,
    is_active,
    context_type
  ) VALUES (
    v_qr_token,
    p_session_id,
    v_session_course_id,
    p_generated_by,
    v_expires_at,
    true,
    'session_attendance'
  )
  RETURNING id INTO v_qr_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'qr_token', v_qr_token,
    'expires_at', v_expires_at,
    'qr_id', v_qr_id
  );
END;
$$;