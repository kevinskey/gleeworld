
-- Fix ambiguous day_of_week column reference
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
  -- Calculate end time
  calc_end_time := p_start_time + (p_duration_minutes || ' minutes')::INTERVAL;
  
  -- Get current date/time in Eastern Time
  current_et := NOW() AT TIME ZONE 'America/New_York';
  current_date_et := current_et::DATE;
  current_time_et := current_et::TIME;
  
  -- Get day of week (0=Sunday, 1=Monday, etc.)
  day_of_week_param := EXTRACT(DOW FROM p_appointment_date);
  
  -- Get service details
  SELECT * INTO service_record FROM public.gw_services WHERE id = p_service_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'available', false,
      'error', 'Service not found or inactive'
    );
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
    RETURN jsonb_build_object(
      'available', false,
      'error', 'Service is not available at the requested time'
    );
  END IF;
  
  -- Check for booking conflicts
  SELECT EXISTS (
    SELECT 1 FROM public.gw_appointments a
    WHERE a.service_id = p_service_id
    AND a.appointment_date = p_appointment_date
    AND a.status IN ('confirmed', 'pending')
    AND (
      (p_start_time < a.end_time AND calc_end_time > a.start_time)
    )
  ) INTO conflicts_exist;
  
  IF conflicts_exist THEN
    RETURN jsonb_build_object(
      'available', false,
      'error', 'Time slot is already booked'
    );
  END IF;
  
  -- Check advance booking limit
  IF p_appointment_date > current_date_et + (service_record.advance_booking_days || ' days')::INTERVAL THEN
    RETURN jsonb_build_object(
      'available', false,
      'error', 'Appointment date is too far in advance'
    );
  END IF;
  
  -- Check if appointment is in the past (using ET timezone)
  IF p_appointment_date < current_date_et OR 
     (p_appointment_date = current_date_et AND p_start_time < current_time_et) THEN
    RETURN jsonb_build_object(
      'available', false,
      'error', 'Cannot book appointments in the past'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'available', true,
    'service', row_to_json(service_record)
  );
END;
$$;
