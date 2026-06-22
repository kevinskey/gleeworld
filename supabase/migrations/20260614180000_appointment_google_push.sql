-- Office Hours v2: link appointments to services + instructors and track
-- per-side Google Calendar event ids so we can push, patch, and delete.

ALTER TABLE public.gw_appointments
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.gw_services(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS instructor_user_id UUID,
  ADD COLUMN IF NOT EXISTS student_google_event_id TEXT,
  ADD COLUMN IF NOT EXISTS instructor_google_event_id TEXT,
  ADD COLUMN IF NOT EXISTS google_push_error TEXT;

CREATE INDEX IF NOT EXISTS gw_appointments_service_id_idx
  ON public.gw_appointments(service_id);
CREATE INDEX IF NOT EXISTS gw_appointments_instructor_user_id_idx
  ON public.gw_appointments(instructor_user_id);

-- Rebuild book_appointment to also store service_id and instructor_user_id
-- so the google-push-appointment edge function can fan out to both sides.
CREATE OR REPLACE FUNCTION public.book_appointment(
  p_service_id uuid,
  p_appointment_date date,
  p_start_time time,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text DEFAULT NULL,
  p_attendee_count integer DEFAULT 1,
  p_special_requests text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  service_record RECORD;
  availability_check JSONB;
  new_appointment_id UUID;
  appointment_timestamp TIMESTAMPTZ;
  resolved_type text;
  resolved_instructor uuid;
BEGIN
  SELECT * INTO service_record FROM public.gw_services WHERE id = p_service_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Service not found or inactive');
  END IF;

  availability_check := public.check_appointment_availability(
    p_service_id, p_appointment_date, p_start_time, service_record.duration_minutes
  );

  IF NOT (availability_check->>'available')::BOOLEAN THEN
    RETURN jsonb_build_object('success', false, 'error', availability_check->>'error');
  END IF;

  appointment_timestamp := (p_appointment_date::text || ' ' || p_start_time::text)::timestamp
                           AT TIME ZONE 'America/New_York';

  resolved_type := CASE
    WHEN service_record.category = 'general' THEN 'general'
    WHEN service_record.category = 'coaching' THEN 'voice-lesson'
    WHEN service_record.category = 'education' THEN 'tutorial'
    WHEN service_record.category = 'rehearsal' THEN 'rehearsal'
    WHEN service_record.category = 'styling' THEN 'Wardrobe Fitting'
    WHEN service_record.category = 'accompaniment' THEN 'consultation'
    ELSE 'other'
  END;

  -- Instructor is the user who owns the service. Falls back to provider lookup.
  resolved_instructor := service_record.created_by;
  IF resolved_instructor IS NULL AND service_record.provider_id IS NOT NULL THEN
    SELECT user_id INTO resolved_instructor
      FROM public.gw_service_providers
     WHERE id = service_record.provider_id;
  END IF;

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
    created_by,
    service_id,
    instructor_user_id,
    assigned_to
  ) VALUES (
    service_record.name || ' - ' || p_customer_name,
    p_special_requests,
    appointment_timestamp,
    service_record.duration_minutes,
    CASE WHEN service_record.requires_approval THEN 'pending' ELSE 'confirmed' END,
    resolved_type,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_special_requests,
    auth.uid(),
    p_service_id,
    resolved_instructor,
    resolved_instructor
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
$function$;
