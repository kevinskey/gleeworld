-- Update process_qr_attendance_scan to allow super admins to bypass enrollment check
CREATE OR REPLACE FUNCTION public.process_qr_attendance_scan(
  p_qr_token TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
  v_token_record RECORD;
  v_existing_record RECORD;
  v_attendance_id UUID;
  v_normalized_token TEXT;
  v_is_enrolled BOOLEAN;
  v_is_super_admin BOOLEAN;
BEGIN
  -- Normalize token: convert URL-safe base64 back to standard if needed
  v_normalized_token := REPLACE(REPLACE(p_qr_token, '-', '+'), '_', '/');
  
  -- First try exact match, then normalized match
  SELECT * INTO v_token_record
  FROM gw_attendance_qr_tokens
  WHERE (qr_token = p_qr_token OR qr_token = v_normalized_token)
    AND expires_at > NOW()
    AND is_used = FALSE
  LIMIT 1;
  
  IF v_token_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_TOKEN',
      'message', 'QR code is invalid or expired. Please ask for a new code.'
    );
  END IF;
  
  -- Get session details
  SELECT s.*, c.title as course_title, c.id as course_id
  INTO v_session
  FROM gw_attendance_sessions s
  LEFT JOIN gw_courses c ON c.id = s.course_id
  WHERE s.id = v_token_record.session_id;
  
  IF v_session IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SESSION_NOT_FOUND',
      'message', 'Attendance session not found.'
    );
  END IF;
  
  -- Check if session is open
  IF v_session.status != 'open' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SESSION_CLOSED',
      'message', 'This attendance session is not currently open.'
    );
  END IF;
  
  -- Check if user is a super admin (bypass enrollment check for testing)
  SELECT is_super_admin INTO v_is_super_admin
  FROM gw_profiles
  WHERE user_id = p_user_id;
  
  v_is_super_admin := COALESCE(v_is_super_admin, FALSE);
  
  -- Check if user is enrolled in the course (skip for super admins)
  IF NOT v_is_super_admin AND v_session.course_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM gw_course_enrollments
      WHERE user_id = p_user_id
        AND course_id = v_session.course_id
        AND enrollment_status = 'enrolled'
    ) INTO v_is_enrolled;
    
    IF NOT v_is_enrolled THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'NOT_ENROLLED',
        'message', 'You are not enrolled in this course: ' || COALESCE(v_session.course_title, 'Unknown Course')
      );
    END IF;
  END IF;
  
  -- Check for existing attendance record
  SELECT * INTO v_existing_record
  FROM gw_attendance_records
  WHERE session_id = v_token_record.session_id
    AND user_id = p_user_id;
  
  IF v_existing_record IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_checked_in', true,
      'message', 'You have already checked in to this session.',
      'attendance_id', v_existing_record.id,
      'session_title', v_session.title,
      'course_title', v_session.course_title,
      'check_in_time', v_existing_record.check_in_time
    );
  END IF;
  
  -- Create attendance record
  INSERT INTO gw_attendance_records (
    session_id,
    user_id,
    status,
    check_in_time,
    check_in_method,
    qr_token_used
  ) VALUES (
    v_token_record.session_id,
    p_user_id,
    'present',
    NOW(),
    'qr_scan',
    p_qr_token
  )
  RETURNING id INTO v_attendance_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'already_checked_in', false,
    'message', 'Successfully checked in!',
    'attendance_id', v_attendance_id,
    'session_title', v_session.title,
    'course_title', v_session.course_title,
    'check_in_time', NOW(),
    'is_super_admin', v_is_super_admin
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'SYSTEM_ERROR',
    'message', 'An error occurred: ' || SQLERRM
  );
END;
$$;