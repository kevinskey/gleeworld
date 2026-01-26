-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Recreate the generate_session_qr_code function with explicit schema reference
CREATE OR REPLACE FUNCTION public.generate_session_qr_code(
  p_session_id UUID,
  p_generated_by UUID,
  p_expires_in_minutes INTEGER DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_session RECORD;
  v_qr_token TEXT;
  v_qr_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Get session info
  SELECT s.*, c.course_code
  INTO v_session
  FROM gw_attendance_sessions s
  LEFT JOIN gw_courses c ON s.course_id = c.id
  WHERE s.id = p_session_id;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session not found');
  END IF;

  -- Deactivate previous QR codes for this session
  UPDATE gw_attendance_qr_codes
  SET is_active = false, updated_at = NOW()
  WHERE attendance_session_id = p_session_id AND is_active = true;

  -- Generate new token using pgcrypto
  v_qr_token := encode(extensions.gen_random_bytes(32), 'base64');
  v_expires_at := NOW() + (p_expires_in_minutes || ' minutes')::interval;

  -- Create new QR code record
  INSERT INTO gw_attendance_qr_codes (
    event_id,
    attendance_session_id,
    course_id,
    qr_token,
    generated_by,
    generated_at,
    expires_at,
    is_active,
    scan_count,
    context_type,
    course_code
  ) VALUES (
    v_session.event_id,
    p_session_id,
    v_session.course_id,
    v_qr_token,
    p_generated_by,
    NOW(),
    v_expires_at,
    true,
    0,
    'session_attendance',
    v_session.course_code
  ) RETURNING id INTO v_qr_id;

  RETURN jsonb_build_object(
    'success', true,
    'qr_token', v_qr_token,
    'qr_id', v_qr_id,
    'expires_at', v_expires_at,
    'session_title', v_session.title
  );
END;
$$;