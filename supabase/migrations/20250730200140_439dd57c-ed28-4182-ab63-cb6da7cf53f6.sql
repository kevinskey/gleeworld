-- Enhance QR attendance system for check-in/check-out with grading
-- Add attendance timing configuration to events
ALTER TABLE public.gw_events 
ADD COLUMN IF NOT EXISTS check_in_start_time interval DEFAULT INTERVAL '30 minutes',
ADD COLUMN IF NOT EXISTS tardy_threshold_minutes integer DEFAULT 15,
ADD COLUMN IF NOT EXISTS require_check_out boolean DEFAULT true;

-- Update gw_event_attendance table for comprehensive tracking
ALTER TABLE public.gw_event_attendance 
ADD COLUMN IF NOT EXISTS check_in_time timestamp with time zone,
ADD COLUMN IF NOT EXISTS check_out_time timestamp with time zone,
ADD COLUMN IF NOT EXISTS is_tardy boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS attendance_status text DEFAULT 'absent',
ADD COLUMN IF NOT EXISTS scan_count integer DEFAULT 0;

-- Add constraint for attendance status
ALTER TABLE public.gw_event_attendance 
DROP CONSTRAINT IF EXISTS valid_attendance_status,
ADD CONSTRAINT valid_attendance_status 
CHECK (attendance_status IN ('present', 'tardy', 'absent', 'excused'));

-- Create function to process QR attendance scan with check-in/check-out logic
CREATE OR REPLACE FUNCTION public.process_qr_attendance_scan(
  qr_token_param text,
  user_id_param uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  qr_record RECORD;
  event_record RECORD;
  user_record RECORD;
  attendance_record RECORD;
  current_time timestamp with time zone;
  event_start_time timestamp with time zone;
  check_in_window_start timestamp with time zone;
  tardy_cutoff timestamp with time zone;
  is_first_scan boolean;
  calculated_status text;
  result jsonb;
BEGIN
  current_time := now();
  
  -- Validate QR code and get event info
  SELECT qr.*, e.title as event_title, e.start_date, e.location, e.check_in_start_time, 
         e.tardy_threshold_minutes, e.require_check_out
  INTO qr_record
  FROM public.gw_event_qr_codes qr
  JOIN public.gw_events e ON e.id = qr.event_id
  WHERE qr.token = qr_token_param 
    AND qr.is_active = true 
    AND qr.expires_at > current_time;
    
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid or expired QR code'
    );
  END IF;
  
  -- Get user info
  SELECT gp.full_name, gp.email, gp.user_id
  INTO user_record
  FROM public.gw_profiles gp
  WHERE gp.user_id = user_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User profile not found'
    );
  END IF;
  
  -- Calculate timing windows
  event_start_time := qr_record.start_date;
  check_in_window_start := event_start_time - qr_record.check_in_start_time;
  tardy_cutoff := event_start_time + INTERVAL '1 minute' * qr_record.tardy_threshold_minutes;
  
  -- Check if check-in window is open
  IF current_time < check_in_window_start THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Check-in not yet available. Window opens ' || qr_record.check_in_start_time::text || ' before event start.'
    );
  END IF;
  
  -- Get or create attendance record
  SELECT * INTO attendance_record
  FROM public.gw_event_attendance
  WHERE event_id = qr_record.event_id AND user_id = user_id_param;
  
  is_first_scan := attendance_record IS NULL OR attendance_record.check_in_time IS NULL;
  
  IF is_first_scan THEN
    -- First scan: CHECK-IN
    IF current_time <= tardy_cutoff THEN
      calculated_status := 'present';
    ELSE
      calculated_status := 'tardy';
    END IF;
    
    -- Insert or update attendance record
    INSERT INTO public.gw_event_attendance (
      event_id, user_id, check_in_time, attendance_status, 
      is_tardy, scan_count, created_at, updated_at
    )
    VALUES (
      qr_record.event_id, user_id_param, current_time, calculated_status,
      calculated_status = 'tardy', 1, current_time, current_time
    )
    ON CONFLICT (event_id, user_id) 
    DO UPDATE SET
      check_in_time = current_time,
      attendance_status = calculated_status,
      is_tardy = calculated_status = 'tardy',
      scan_count = gw_event_attendance.scan_count + 1,
      updated_at = current_time;
    
    -- Log the scan
    INSERT INTO public.gw_attendance_scans (
      qr_code_id, user_id, scan_type, scanned_at
    ) VALUES (
      qr_record.id, user_id_param, 'check_in', current_time
    );
    
    result := jsonb_build_object(
      'success', true,
      'message', 'Checked in successfully!',
      'scan_type', 'check_in',
      'status', calculated_status,
      'user_name', user_record.full_name,
      'event_title', qr_record.event_title,
      'scan_time', current_time,
      'is_tardy', calculated_status = 'tardy'
    );
    
  ELSE
    -- Second scan: CHECK-OUT (if required)
    IF NOT qr_record.require_check_out THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Check-out not required for this event'
      );
    END IF;
    
    IF attendance_record.check_out_time IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Already checked out at ' || attendance_record.check_out_time::text
      );
    END IF;
    
    -- Update with check-out time
    UPDATE public.gw_event_attendance
    SET check_out_time = current_time,
        scan_count = scan_count + 1,
        updated_at = current_time
    WHERE event_id = qr_record.event_id AND user_id = user_id_param;
    
    -- Log the scan
    INSERT INTO public.gw_attendance_scans (
      qr_code_id, user_id, scan_type, scanned_at
    ) VALUES (
      qr_record.id, user_id_param, 'check_out', current_time
    );
    
    result := jsonb_build_object(
      'success', true,
      'message', 'Checked out successfully!',
      'scan_type', 'check_out',
      'status', attendance_record.attendance_status,
      'user_name', user_record.full_name,
      'event_title', qr_record.event_title,
      'scan_time', current_time,
      'check_in_time', attendance_record.check_in_time,
      'check_out_time', current_time
    );
  END IF;
  
  -- Update QR code scan count
  UPDATE public.gw_event_qr_codes
  SET scan_count = scan_count + 1,
      last_scanned_at = current_time
  WHERE id = qr_record.id;
  
  RETURN result;
END;
$$;

-- Create grading view for attendance reports
CREATE OR REPLACE VIEW public.attendance_grading_report AS
SELECT 
  e.id as event_id,
  e.title as event_title,
  e.start_date as event_date,
  e.event_type,
  gp.user_id,
  gp.full_name,
  gp.email,
  gp.role,
  COALESCE(att.attendance_status, 'absent') as attendance_status,
  att.check_in_time,
  att.check_out_time,
  att.is_tardy,
  att.scan_count,
  CASE 
    WHEN att.attendance_status = 'present' THEN 1.0
    WHEN att.attendance_status = 'tardy' THEN 0.8
    WHEN att.attendance_status = 'excused' THEN 1.0
    ELSE 0.0
  END as attendance_score,
  e.start_date - att.check_in_time as early_arrival_time,
  CASE 
    WHEN att.check_in_time IS NULL THEN 'No check-in'
    WHEN att.check_in_time > e.start_date + INTERVAL '1 minute' * e.tardy_threshold_minutes THEN 'Late'
    ELSE 'On time'
  END as punctuality_status
FROM public.gw_events e
CROSS JOIN public.gw_profiles gp
LEFT JOIN public.gw_event_attendance att ON e.id = att.event_id AND gp.user_id = att.user_id
WHERE gp.role IN ('member', 'executive')
  AND e.event_type IN ('rehearsal', 'performance', 'meeting')
ORDER BY e.start_date DESC, gp.full_name;

-- Enable RLS on attendance scans table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'gw_attendance_scans') THEN
    ALTER TABLE public.gw_attendance_scans ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view their own scans" ON public.gw_attendance_scans;
    CREATE POLICY "Users can view their own scans" ON public.gw_attendance_scans
      FOR SELECT USING (user_id = auth.uid());
      
    DROP POLICY IF EXISTS "Admins can view all scans" ON public.gw_attendance_scans;
    CREATE POLICY "Admins can view all scans" ON public.gw_attendance_scans
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.gw_profiles 
          WHERE user_id = auth.uid() 
          AND (is_admin = true OR is_super_admin = true)
        )
      );
      
    DROP POLICY IF EXISTS "System can create scans" ON public.gw_attendance_scans;
    CREATE POLICY "System can create scans" ON public.gw_attendance_scans
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;