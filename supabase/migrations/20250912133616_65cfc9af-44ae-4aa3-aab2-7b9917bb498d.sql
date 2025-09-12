-- Create QR attendance tokens table
CREATE TABLE public.qr_attendance_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  event_id UUID NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  scan_count INTEGER NOT NULL DEFAULT 0,
  max_scans INTEGER DEFAULT 100
);

-- Enable RLS
ALTER TABLE public.qr_attendance_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can view all QR tokens" 
ON public.qr_attendance_tokens 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true OR is_exec_board = true)
));

CREATE POLICY "Admins can create QR tokens" 
ON public.qr_attendance_tokens 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true OR is_exec_board = true)
));

CREATE POLICY "System can update QR tokens for scans" 
ON public.qr_attendance_tokens 
FOR UPDATE 
USING (true);

-- Create function to generate QR attendance tokens
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

-- Update the QR attendance scan processing function to work with tokens
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
  v_result JSONB;
BEGIN
  -- Validate token
  SELECT * INTO v_token_record
  FROM qr_attendance_tokens
  WHERE token = qr_token_param
    AND is_active = true
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired QR code',
      'error_code', 'INVALID_TOKEN'
    );
  END IF;

  -- Get event details
  SELECT * INTO v_event_record
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
  SELECT * INTO v_existing_attendance
  FROM attendance
  WHERE event_id = v_token_record.event_id
    AND user_id = user_id_param;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Attendance already recorded for this event',
      'error_code', 'DUPLICATE_ATTENDANCE',
      'event', jsonb_build_object(
        'id', v_event_record.id,
        'title', v_event_record.title,
        'start_date', v_event_record.start_date,
        'event_type', v_event_record.event_type
      ),
      'existing_status', v_existing_attendance.status
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
  SET scan_count = scan_count + 1
  WHERE id = v_token_record.id;

  -- Log the scan
  INSERT INTO activity_logs (
    user_id,
    action_type,
    resource_type,
    resource_id,
    details,
    user_agent,
    ip_address
  ) VALUES (
    user_id_param,
    'qr_attendance_scan',
    'attendance',
    v_token_record.event_id::TEXT,
    jsonb_build_object(
      'token_id', v_token_record.id,
      'event_title', v_event_record.title,
      'scan_location', scan_location_param
    ),
    user_agent_param,
    ip_address_param
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Attendance recorded successfully',
    'event', jsonb_build_object(
      'id', v_event_record.id,
      'title', v_event_record.title,
      'start_date', v_event_record.start_date,
      'event_type', v_event_record.event_type,
      'location', v_event_record.location
    ),
    'attendance_status', 'present'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Internal server error: ' || SQLERRM,
      'error_code', 'INTERNAL_ERROR'
    );
END;
$$;