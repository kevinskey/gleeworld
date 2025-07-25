-- Create QR code tracking table for attendance
CREATE TABLE public.gw_attendance_qr_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL,
  qr_token TEXT NOT NULL UNIQUE,
  generated_by UUID NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  scan_count INTEGER NOT NULL DEFAULT 0,
  max_scans INTEGER DEFAULT NULL,
  location_data JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create QR code scan tracking table
CREATE TABLE public.gw_attendance_qr_scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  qr_code_id UUID NOT NULL REFERENCES public.gw_attendance_qr_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scan_location JSONB DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  ip_address INET DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_attendance_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_attendance_qr_scans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for QR codes
CREATE POLICY "Admins and secretaries can manage QR codes" 
ON public.gw_attendance_qr_codes 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR role IN ('admin', 'super-admin', 'secretary'))
  )
);

CREATE POLICY "Members can view active QR codes for events they can attend" 
ON public.gw_attendance_qr_codes 
FOR SELECT 
USING (
  is_active = true 
  AND expires_at > now()
  AND EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid()
  )
);

-- RLS Policies for QR scans
CREATE POLICY "Users can view their own QR scans" 
ON public.gw_attendance_qr_scans 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own QR scans" 
ON public.gw_attendance_qr_scans 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all QR scans" 
ON public.gw_attendance_qr_scans 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR role IN ('admin', 'super-admin', 'secretary'))
  )
);

-- Create indexes for performance
CREATE INDEX idx_gw_attendance_qr_codes_event_id ON public.gw_attendance_qr_codes(event_id);
CREATE INDEX idx_gw_attendance_qr_codes_token ON public.gw_attendance_qr_codes(qr_token);
CREATE INDEX idx_gw_attendance_qr_codes_expires_at ON public.gw_attendance_qr_codes(expires_at);
CREATE INDEX idx_gw_attendance_qr_scans_qr_code_id ON public.gw_attendance_qr_scans(qr_code_id);
CREATE INDEX idx_gw_attendance_qr_scans_user_id ON public.gw_attendance_qr_scans(user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_gw_attendance_qr_codes_updated_at
  BEFORE UPDATE ON public.gw_attendance_qr_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate QR code token
CREATE OR REPLACE FUNCTION generate_qr_token(event_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token TEXT;
BEGIN
  -- Generate a secure token combining event ID, timestamp, and random string
  token := encode(
    digest(
      event_id_param::text || 
      extract(epoch from now())::text || 
      gen_random_bytes(16)::text, 
      'sha256'
    ), 
    'base64'
  );
  
  RETURN token;
END;
$$;

-- Function to validate and process QR scan
CREATE OR REPLACE FUNCTION process_qr_attendance_scan(
  qr_token_param TEXT,
  user_id_param UUID,
  scan_location_param JSONB DEFAULT NULL,
  user_agent_param TEXT DEFAULT NULL,
  ip_address_param INET DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  qr_record RECORD;
  existing_scan_count INTEGER;
  attendance_record RECORD;
BEGIN
  -- Get QR code record
  SELECT * INTO qr_record
  FROM public.gw_attendance_qr_codes 
  WHERE qr_token = qr_token_param 
  AND is_active = true 
  AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired QR code'
    );
  END IF;
  
  -- Check if user already scanned this QR code
  SELECT COUNT(*) INTO existing_scan_count
  FROM public.gw_attendance_qr_scans
  WHERE qr_code_id = qr_record.id 
  AND user_id = user_id_param;
  
  IF existing_scan_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You have already scanned this QR code'
    );
  END IF;
  
  -- Record the scan
  INSERT INTO public.gw_attendance_qr_scans (
    qr_code_id, user_id, scan_location, user_agent, ip_address
  ) VALUES (
    qr_record.id, user_id_param, scan_location_param, user_agent_param, ip_address_param
  );
  
  -- Update scan count
  UPDATE public.gw_attendance_qr_codes 
  SET scan_count = scan_count + 1
  WHERE id = qr_record.id;
  
  -- Create or update attendance record
  INSERT INTO public.gw_attendance (
    event_id, user_id, status, notes, created_at, updated_at
  ) VALUES (
    qr_record.event_id, user_id_param, 'present', 'Marked via QR scan', now(), now()
  )
  ON CONFLICT (event_id, user_id) 
  DO UPDATE SET 
    status = 'present',
    notes = COALESCE(gw_attendance.notes, '') || ' | QR scan at ' || now()::text,
    updated_at = now();
  
  -- Get event details for response
  SELECT title INTO attendance_record
  FROM public.gw_events 
  WHERE id = qr_record.event_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Attendance marked successfully',
    'event_title', COALESCE(attendance_record.title, 'Event'),
    'scanned_at', now()
  );
END;
$$;