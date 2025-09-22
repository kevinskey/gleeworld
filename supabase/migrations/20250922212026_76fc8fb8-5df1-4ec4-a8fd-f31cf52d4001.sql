-- Fix QR attendance scan function to properly handle token validation and ensure everyone can scan

-- Update the process_qr_attendance_scan function to properly bypass RLS for token validation
DROP FUNCTION IF EXISTS public.process_qr_attendance_scan(text, uuid, jsonb, text, inet);

CREATE OR REPLACE FUNCTION public.process_qr_attendance_scan(
  qr_token_param TEXT,
  user_id_param UUID,
  scan_location_param JSONB DEFAULT NULL,
  user_agent_param TEXT DEFAULT NULL,
  ip_address_param INET DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_record RECORD;
  v_event_record RECORD;
  v_existing_attendance RECORD;
  v_user_profile RECORD;
  v_result JSONB;
BEGIN
  -- Validate inputs
  IF qr_token_param IS NULL OR user_id_param IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Missing required parameters',
      'error_code', 'INVALID_INPUT'
    );
  END IF;

  -- Get user profile for name
  SELECT full_name, email INTO v_user_profile
  FROM gw_profiles
  WHERE user_id = user_id_param;

  -- Validate token (bypassing RLS with SECURITY DEFINER)
  SELECT token, event_id, created_by, expires_at, is_active, scan_count
  INTO v_token_record
  FROM qr_attendance_tokens
  WHERE token = qr_token_param
    AND is_active = true
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired QR code. Please ask your instructor for a new code.',
      'error_code', 'INVALID_TOKEN'
    );
  END IF;

  -- Get event details
  SELECT id, title, start_date, event_type, location
  INTO v_event_record
  FROM gw_events
  WHERE id = v_token_record.event_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Event not found',
      'error_code', 'EVENT_NOT_FOUND'
    );
  END IF;

  -- Check if attendance already exists
  SELECT status, notes, recorded_at
  INTO v_existing_attendance
  FROM attendance
  WHERE event_id = v_token_record.event_id
    AND user_id = user_id_param;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You have already checked in for this event',
      'error_code', 'DUPLICATE_ATTENDANCE',
      'event', jsonb_build_object(
        'id', v_event_record.id,
        'title', v_event_record.title,
        'start_date', v_event_record.start_date,
        'event_type', v_event_record.event_type,
        'location', v_event_record.location
      ),
      'existing_status', v_existing_attendance.status,
      'recorded_at', v_existing_attendance.recorded_at
    );
  END IF;

  -- Record attendance
  INSERT INTO attendance (
    event_id,
    user_id,
    status,
    notes,
    recorded_at
  ) VALUES (
    v_token_record.event_id,
    user_id_param,
    'present',
    'QR Code Check-in',
    now()
  );

  -- Update token scan count
  UPDATE qr_attendance_tokens
  SET scan_count = scan_count + 1,
      last_used_at = now()
  WHERE token = qr_token_param;

  -- Log the successful scan
  INSERT INTO activity_logs (
    user_id,
    action_type,
    resource_type,
    resource_id,
    details
  ) VALUES (
    user_id_param,
    'qr_attendance_scan',
    'attendance',
    v_event_record.id,
    jsonb_build_object(
      'event_title', v_event_record.title,
      'scan_method', 'qr_code',
      'token_id', v_token_record.token,
      'user_agent', user_agent_param,
      'ip_address', ip_address_param,
      'scan_location', scan_location_param
    )
  );

  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Attendance recorded successfully!',
    'event', jsonb_build_object(
      'id', v_event_record.id,
      'title', v_event_record.title,
      'start_date', v_event_record.start_date,
      'event_type', v_event_record.event_type,
      'location', v_event_record.location
    ),
    'user', jsonb_build_object(
      'name', COALESCE(v_user_profile.full_name, v_user_profile.email, 'Unknown User'),
      'email', v_user_profile.email
    ),
    'timestamp', now()
  );

EXCEPTION WHEN OTHERS THEN
  -- Log the error for debugging
  INSERT INTO activity_logs (
    user_id,
    action_type,
    resource_type,
    details
  ) VALUES (
    user_id_param,
    'qr_scan_error',
    'attendance',
    jsonb_build_object(
      'error', SQLERRM,
      'sqlstate', SQLSTATE,
      'token_provided', qr_token_param IS NOT NULL,
      'user_id_provided', user_id_param IS NOT NULL
    )
  );

  RETURN jsonb_build_object(
    'success', false,
    'error', 'An error occurred while processing attendance. Please try again.',
    'error_code', 'PROCESSING_ERROR',
    'debug_info', jsonb_build_object(
      'sql_error', SQLERRM,
      'sql_state', SQLSTATE
    )
  );
END;
$$;

-- Ensure RLS policies allow public scanning access
DROP POLICY IF EXISTS "Public can read tokens for scanning" ON qr_attendance_tokens;

CREATE POLICY "Public can read active tokens for scanning" ON qr_attendance_tokens
  FOR SELECT
  USING (is_active = true AND expires_at > now());

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.process_qr_attendance_scan(text, uuid, jsonb, text, inet) TO anon;
GRANT EXECUTE ON FUNCTION public.process_qr_attendance_scan(text, uuid, jsonb, text, inet) TO authenticated;