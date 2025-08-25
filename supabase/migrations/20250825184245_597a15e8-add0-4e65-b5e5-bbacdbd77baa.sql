-- Create QR scan tracking table for better analytics
CREATE TABLE IF NOT EXISTS public.qr_scan_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  qr_token TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  event_id UUID,
  scan_result JSONB,
  scan_status TEXT CHECK (scan_status IN ('success', 'failed', 'duplicate', 'expired')),
  ip_address INET,
  user_agent TEXT,
  scan_location TEXT,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.qr_scan_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for QR scan logs
CREATE POLICY "Admins can view all QR scan logs" ON public.qr_scan_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

CREATE POLICY "Users can view their own scan logs" ON public.qr_scan_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert QR scan logs" ON public.qr_scan_logs
  FOR INSERT WITH CHECK (true);

-- Create updated QR attendance processing function with better logging
CREATE OR REPLACE FUNCTION public.process_qr_attendance_scan(
  qr_token_param TEXT,
  user_id_param UUID,
  scan_location_param TEXT DEFAULT NULL,
  user_agent_param TEXT DEFAULT NULL,
  ip_address_param INET DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  event_record RECORD;
  user_record RECORD;
  existing_attendance RECORD;
  scan_log_id UUID;
  result JSONB;
BEGIN
  -- Rate limiting check
  IF NOT check_rate_limit_secure(
    COALESCE(user_id_param::text, ip_address_param::text, 'anonymous'),
    'qr_attendance_scan',
    10, -- max 10 attempts
    5   -- per 5 minutes
  ) THEN
    -- Log failed attempt
    INSERT INTO public.qr_scan_logs (
      qr_token, user_id, scan_status, ip_address, user_agent, scan_location, scan_result
    ) VALUES (
      qr_token_param, user_id_param, 'failed', ip_address_param, user_agent_param, scan_location_param,
      jsonb_build_object('error', 'rate_limit_exceeded', 'message', 'Too many scan attempts')
    ) RETURNING id INTO scan_log_id;
    
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Too many scan attempts. Please wait before trying again.',
      'error', 'rate_limit_exceeded',
      'scan_log_id', scan_log_id
    );
  END IF;

  -- Validate user
  SELECT * INTO user_record FROM public.gw_profiles WHERE user_id = user_id_param;
  IF NOT FOUND THEN
    INSERT INTO public.qr_scan_logs (
      qr_token, user_id, scan_status, ip_address, user_agent, scan_location, scan_result
    ) VALUES (
      qr_token_param, user_id_param, 'failed', ip_address_param, user_agent_param, scan_location_param,
      jsonb_build_object('error', 'invalid_user', 'message', 'User not found or not authorized')
    ) RETURNING id INTO scan_log_id;
    
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User not found or not authorized for attendance',
      'error', 'invalid_user',
      'scan_log_id', scan_log_id
    );
  END IF;

  -- Find event by QR token (assuming token contains event info)
  -- For now, we'll look for active events that might match
  SELECT e.* INTO event_record 
  FROM public.gw_events e 
  WHERE e.start_date >= now() - INTERVAL '2 hours' 
  AND e.start_date <= now() + INTERVAL '12 hours'
  AND e.attendance_required = true
  ORDER BY e.start_date ASC 
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.qr_scan_logs (
      qr_token, user_id, scan_status, ip_address, user_agent, scan_location, scan_result
    ) VALUES (
      qr_token_param, user_id_param, 'failed', ip_address_param, user_agent_param, scan_location_param,
      jsonb_build_object('error', 'no_active_event', 'message', 'No active event found for attendance')
    ) RETURNING id INTO scan_log_id;
    
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No active event found for attendance scanning',
      'error', 'no_active_event',
      'scan_log_id', scan_log_id
    );
  END IF;

  -- Check for existing attendance
  SELECT * INTO existing_attendance 
  FROM public.attendance 
  WHERE user_id = user_id_param AND event_id = event_record.id;

  IF FOUND THEN
    INSERT INTO public.qr_scan_logs (
      qr_token, user_id, event_id, scan_status, ip_address, user_agent, scan_location, scan_result
    ) VALUES (
      qr_token_param, user_id_param, event_record.id, 'duplicate', ip_address_param, user_agent_param, scan_location_param,
      jsonb_build_object(
        'message', 'Attendance already recorded',
        'event_title', event_record.title,
        'existing_status', existing_attendance.status,
        'recorded_at', existing_attendance.recorded_at
      )
    ) RETURNING id INTO scan_log_id;
    
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Attendance already recorded for this event',
      'event_title', event_record.title,
      'recorded_at', existing_attendance.recorded_at,
      'scan_log_id', scan_log_id
    );
  END IF;

  -- Record attendance
  INSERT INTO public.attendance (user_id, event_id, status, notes)
  VALUES (user_id_param, event_record.id, 'present', 'QR Code Scan');

  -- Log successful scan
  INSERT INTO public.qr_scan_logs (
    qr_token, user_id, event_id, scan_status, ip_address, user_agent, scan_location, scan_result
  ) VALUES (
    qr_token_param, user_id_param, event_record.id, 'success', ip_address_param, user_agent_param, scan_location_param,
    jsonb_build_object(
      'message', 'Attendance recorded successfully',
      'event_title', event_record.title,
      'user_name', user_record.full_name,
      'user_email', user_record.email
    )
  ) RETURNING id INTO scan_log_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Attendance recorded successfully!',
    'event_title', event_record.title,
    'scanned_at', now(),
    'event_info', jsonb_build_object(
      'title', event_record.title,
      'start_date', event_record.start_date,
      'location', event_record.location
    ),
    'scan_log_id', scan_log_id
  );
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_user_id ON public.qr_scan_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_event_id ON public.qr_scan_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_scanned_at ON public.qr_scan_logs(scanned_at);
CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_scan_status ON public.qr_scan_logs(scan_status);