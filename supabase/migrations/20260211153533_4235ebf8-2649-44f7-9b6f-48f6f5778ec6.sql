
-- Fix check_appointment_availability to use actual gw_appointments column names
CREATE OR REPLACE FUNCTION public.check_appointment_availability(
  p_service_id UUID,
  p_appointment_date DATE,
  p_start_time TIME,
  p_duration_minutes INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  service_record RECORD;
  availability_exists BOOLEAN := false;
  conflicts_exist BOOLEAN := false;
  calc_end_time TIME;
  day_of_week_param INTEGER;
  current_et TIMESTAMPTZ;
  current_date_et DATE;
  current_time_et TIME;
BEGIN
  calc_end_time := p_start_time + (p_duration_minutes || ' minutes')::INTERVAL;
  
  current_et := NOW() AT TIME ZONE 'America/New_York';
  current_date_et := current_et::DATE;
  current_time_et := current_et::TIME;
  
  day_of_week_param := EXTRACT(DOW FROM p_appointment_date);
  
  SELECT * INTO service_record FROM public.gw_services WHERE id = p_service_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('available', false, 'error', 'Service not found or inactive');
  END IF;
  
  -- Check if service is available on this day and time
  SELECT EXISTS (
    SELECT 1 FROM public.gw_service_availability sa
    WHERE sa.service_id = p_service_id
    AND sa.day_of_week = day_of_week_param
    AND sa.is_active = true
    AND p_start_time >= sa.start_time
    AND calc_end_time <= sa.end_time
  ) INTO availability_exists;
  
  IF NOT availability_exists THEN
    RETURN jsonb_build_object('available', false, 'error', 'Service is not available at the requested time');
  END IF;
  
  -- Check for booking conflicts using actual gw_appointments columns
  -- gw_appointments uses appointment_date (timestamptz), appointment_type, and duration_minutes
  SELECT EXISTS (
    SELECT 1 FROM public.gw_appointments a
    WHERE a.appointment_date::date = p_appointment_date
    AND a.status IN ('confirmed', 'pending')
    AND a.appointment_type = (SELECT name FROM public.gw_services WHERE id = p_service_id)
    AND (
      p_start_time < (a.appointment_date AT TIME ZONE 'America/New_York')::time + (COALESCE(a.duration_minutes, 30) || ' minutes')::INTERVAL
      AND calc_end_time > (a.appointment_date AT TIME ZONE 'America/New_York')::time
    )
  ) INTO conflicts_exist;
  
  IF conflicts_exist THEN
    RETURN jsonb_build_object('available', false, 'error', 'Time slot is already booked');
  END IF;
  
  -- Check advance booking limit
  IF p_appointment_date > current_date_et + (service_record.advance_booking_days || ' days')::INTERVAL THEN
    RETURN jsonb_build_object('available', false, 'error', 'Appointment date is too far in advance');
  END IF;
  
  -- Check if appointment is in the past (ET)
  IF p_appointment_date < current_date_et OR 
     (p_appointment_date = current_date_et AND p_start_time < current_time_et) THEN
    RETURN jsonb_build_object('available', false, 'error', 'Cannot book appointments in the past');
  END IF;
  
  RETURN jsonb_build_object('available', true, 'service', row_to_json(service_record));
END;
$$;

-- Also fix book_appointment to use actual gw_appointments columns
CREATE OR REPLACE FUNCTION public.book_appointment(
  p_service_id UUID,
  p_appointment_date DATE,
  p_start_time TIME,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_customer_phone TEXT DEFAULT NULL,
  p_attendee_count INTEGER DEFAULT 1,
  p_special_requests TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  service_record RECORD;
  availability_check JSONB;
  new_appointment_id UUID;
  appointment_timestamp TIMESTAMPTZ;
BEGIN
  SELECT * INTO service_record FROM public.gw_services WHERE id = p_service_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Service not found or inactive');
  END IF;
  
  -- Check availability
  availability_check := public.check_appointment_availability(
    p_service_id, p_appointment_date, p_start_time, service_record.duration_minutes
  );
  
  IF NOT (availability_check->>'available')::BOOLEAN THEN
    RETURN jsonb_build_object('success', false, 'error', availability_check->>'error');
  END IF;
  
  -- Build the appointment timestamp in ET then convert to UTC for storage
  appointment_timestamp := (p_appointment_date::text || ' ' || p_start_time::text)::timestamp 
                           AT TIME ZONE 'America/New_York';
  
  -- Insert using actual gw_appointments columns
  INSERT INTO public.gw_appointments (
    title,
    description,
    appointment_date,
    duration_minutes,
    status,
    appointment_type,
    client_name,
    client_email,
    client_phone,
    notes,
    created_by
  ) VALUES (
    service_record.name || ' - ' || p_customer_name,
    p_special_requests,
    appointment_timestamp,
    service_record.duration_minutes,
    CASE WHEN service_record.requires_approval THEN 'pending' ELSE 'confirmed' END,
    service_record.name,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_special_requests,
    auth.uid()
  ) RETURNING id INTO new_appointment_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'appointment_id', new_appointment_id,
    'status', CASE WHEN service_record.requires_approval THEN 'pending' ELSE 'confirmed' END,
    'message', CASE 
      WHEN service_record.requires_approval THEN 'Appointment request submitted for approval'
      ELSE 'Appointment confirmed successfully'
    END
  );
END;
$$;
