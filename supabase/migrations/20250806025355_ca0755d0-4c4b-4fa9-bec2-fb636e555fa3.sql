-- Check if gw_appointments table already exists, if not create it
-- (Since gw_appointments was already referenced in functions, it likely exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'gw_appointments' AND table_schema = 'public') THEN
    -- Create appointments table for booking management
    CREATE TABLE public.gw_appointments (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      service_id UUID REFERENCES public.gw_services(id) ON DELETE CASCADE,
      user_id UUID,
      appointment_date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      duration_minutes INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed',
      attendee_count INTEGER DEFAULT 1,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT,
      special_requests TEXT,
      notes TEXT,
      cancellation_reason TEXT,
      cancelled_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );

    -- Enable RLS for appointments
    ALTER TABLE public.gw_appointments ENABLE ROW LEVEL SECURITY;

    -- Create policies for appointments
    CREATE POLICY "Users can view their own appointments" 
    ON public.gw_appointments 
    FOR SELECT 
    USING (auth.uid() = user_id);

    CREATE POLICY "Admins can manage all appointments" 
    ON public.gw_appointments 
    FOR ALL 
    USING (
      EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = auth.uid() 
        AND (is_admin = true OR is_super_admin = true)
      )
    );

    CREATE POLICY "Anyone can create appointments" 
    ON public.gw_appointments 
    FOR INSERT 
    WITH CHECK (true);

    -- Create updated_at trigger for appointments
    CREATE TRIGGER update_gw_appointments_updated_at
      BEFORE UPDATE ON public.gw_appointments
      FOR EACH ROW
      EXECUTE FUNCTION public.update_gw_appointments_updated_at();
  END IF;
END $$;

-- Create function to check appointment availability
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
  end_time TIME;
  day_of_week INTEGER;
  result JSONB;
BEGIN
  -- Calculate end time
  end_time := p_start_time + (p_duration_minutes || ' minutes')::INTERVAL;
  
  -- Get day of week (0=Sunday, 1=Monday, etc.)
  day_of_week := EXTRACT(DOW FROM p_appointment_date);
  
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
    AND sa.day_of_week = day_of_week
    AND sa.is_active = true
    AND p_start_time >= sa.start_time
    AND end_time <= sa.end_time
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
      (p_start_time < a.end_time AND end_time > a.start_time)
    )
  ) INTO conflicts_exist;
  
  IF conflicts_exist THEN
    RETURN jsonb_build_object(
      'available', false,
      'error', 'Time slot is already booked'
    );
  END IF;
  
  -- Check advance booking limit
  IF p_appointment_date > CURRENT_DATE + (service_record.advance_booking_days || ' days')::INTERVAL THEN
    RETURN jsonb_build_object(
      'available', false,
      'error', 'Appointment date is too far in advance'
    );
  END IF;
  
  -- Check if appointment is in the past
  IF p_appointment_date < CURRENT_DATE OR 
     (p_appointment_date = CURRENT_DATE AND p_start_time < CURRENT_TIME) THEN
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

-- Create function to book an appointment
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
  appointment_id UUID;
  end_time TIME;
BEGIN
  -- Get service details
  SELECT * INTO service_record FROM public.gw_services WHERE id = p_service_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Service not found or inactive'
    );
  END IF;
  
  -- Check availability
  availability_check := public.check_appointment_availability(
    p_service_id, 
    p_appointment_date, 
    p_start_time, 
    service_record.duration_minutes
  );
  
  IF NOT (availability_check->>'available')::BOOLEAN THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', availability_check->>'error'
    );
  END IF;
  
  -- Check attendee count
  IF p_attendee_count < service_record.capacity_min OR p_attendee_count > service_record.capacity_max THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid attendee count for this service'
    );
  END IF;
  
  -- Calculate end time
  end_time := p_start_time + (service_record.duration_minutes || ' minutes')::INTERVAL;
  
  -- Create the appointment
  INSERT INTO public.gw_appointments (
    service_id,
    user_id,
    appointment_date,
    start_time,
    end_time,
    duration_minutes,
    attendee_count,
    customer_name,
    customer_email,
    customer_phone,
    special_requests,
    status
  ) VALUES (
    p_service_id,
    auth.uid(),
    p_appointment_date,
    p_start_time,
    end_time,
    service_record.duration_minutes,
    p_attendee_count,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_special_requests,
    CASE WHEN service_record.requires_approval THEN 'pending' ELSE 'confirmed' END
  ) RETURNING id INTO appointment_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'appointment_id', appointment_id,
    'status', CASE WHEN service_record.requires_approval THEN 'pending' ELSE 'confirmed' END,
    'message', CASE 
      WHEN service_record.requires_approval THEN 'Appointment request submitted for approval'
      ELSE 'Appointment confirmed successfully'
    END
  );
END;
$$;

-- Create function to get available time slots
CREATE OR REPLACE FUNCTION public.get_available_time_slots(
  p_service_id UUID,
  p_date DATE
) RETURNS TABLE(
  start_time TIME,
  end_time TIME,
  available BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  service_record RECORD;
  day_of_week INTEGER;
  slot_start TIME;
  slot_end TIME;
  slot_duration INTERVAL;
BEGIN
  -- Get service details
  SELECT * INTO service_record FROM public.gw_services WHERE id = p_service_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Get day of week
  day_of_week := EXTRACT(DOW FROM p_date);
  
  -- Get service duration
  slot_duration := (service_record.duration_minutes || ' minutes')::INTERVAL;
  
  -- Generate time slots for each availability window
  FOR slot_start, slot_end IN
    SELECT sa.start_time, sa.end_time
    FROM public.gw_service_availability sa
    WHERE sa.service_id = p_service_id
    AND sa.day_of_week = day_of_week
    AND sa.is_active = true
  LOOP
    -- Generate slots within this availability window
    WHILE slot_start + slot_duration <= slot_end LOOP
      -- Check if this slot is available
      RETURN QUERY
      SELECT 
        slot_start,
        slot_start + slot_duration,
        NOT EXISTS (
          SELECT 1 FROM public.gw_appointments a
          WHERE a.service_id = p_service_id
          AND a.appointment_date = p_date
          AND a.status IN ('confirmed', 'pending')
          AND slot_start < a.end_time
          AND (slot_start + slot_duration) > a.start_time
        );
      
      -- Move to next slot
      slot_start := slot_start + slot_duration;
    END LOOP;
  END LOOP;
END;
$$;