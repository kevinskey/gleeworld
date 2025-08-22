-- Fix the process_qr_attendance_scan function to use the correct attendance table name
DROP FUNCTION IF EXISTS public.process_qr_attendance_scan(text, uuid, jsonb, text, inet);

CREATE OR REPLACE FUNCTION public.process_qr_attendance_scan(
  qr_token_param text,
  user_id_param uuid,
  scan_location_param jsonb DEFAULT NULL,
  user_agent_param text DEFAULT NULL,
  ip_address_param inet DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  qr_record RECORD;
  scan_record RECORD;
  attendance_record RECORD;
  result jsonb;
BEGIN
  -- Validate input
  IF qr_token_param IS NULL OR user_id_param IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid parameters'
    );
  END IF;

  -- Find the QR code record
  SELECT * INTO qr_record
  FROM public.gw_attendance_qr_codes
  WHERE qr_token = qr_token_param
    AND is_active = true
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'QR code not found, expired, or inactive'
    );
  END IF;

  -- Check if user already scanned this QR code
  SELECT * INTO scan_record
  FROM public.gw_attendance_qr_scans
  WHERE qr_code_id = qr_record.id
    AND user_id = user_id_param;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'You have already scanned this QR code'
    );
  END IF;

  -- Record the QR scan
  INSERT INTO public.gw_attendance_qr_scans (
    qr_code_id, user_id, scan_location, user_agent, ip_address, scanned_at
  ) VALUES (
    qr_record.id, user_id_param, scan_location_param, user_agent_param, ip_address_param, now()
  );

  -- Record attendance using the correct table name
  INSERT INTO public.attendance (
    event_id, user_id, status, notes, recorded_at
  ) VALUES (
    qr_record.event_id, user_id_param, 'present', 'Marked via QR scan', now()
  )
  ON CONFLICT (event_id, user_id) 
  DO UPDATE SET 
    status = 'present',
    notes = COALESCE(attendance.notes, '') || ' | QR scan at ' || now()::text,
    recorded_at = now();

  -- Update scan count
  UPDATE public.gw_attendance_qr_codes
  SET scan_count = scan_count + 1
  WHERE id = qr_record.id;

  -- Get event info for response
  SELECT title, start_date INTO attendance_record
  FROM public.events
  WHERE id = qr_record.event_id;

  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Attendance recorded successfully',
    'event_info', jsonb_build_object(
      'title', attendance_record.title,
      'start_date', attendance_record.start_date
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Error processing scan: ' || SQLERRM
    );
END;
$$;