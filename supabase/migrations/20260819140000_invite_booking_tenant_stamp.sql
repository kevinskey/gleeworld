-- Guest bookings were landing with tenant_id NULL.
--
-- gw_appointments has trg_set_tenant_id, which fills tenant_id from
-- current_tenant_id() — the caller's session. That works for a logged-in
-- student. It does not work for the people this flow exists to serve: invited
-- guests with no account, no JWT tenant claim, and no x-tenant-slug header.
-- current_tenant_id() returns NULL for them, the trigger stamps NULL, and the
-- appointment becomes invisible to every tenant-scoped read — including the
-- host's own Bookings tab. The meeting is on the books and nobody can see it.
--
-- The invite already knows the answer. Stamp tenant_id explicitly from the
-- invite (falling back to the parent service) so the trigger has nothing left
-- to guess at.

CREATE OR REPLACE FUNCTION public.book_appointment_with_invite(
  p_token text,
  p_appointment_date date,
  p_start_time time,
  p_notes text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  inv public.gw_booking_invites;
  service_record RECORD;
  availability_check JSONB;
  new_appointment_id UUID;
  appointment_timestamp TIMESTAMPTZ;
  resolved_type text;
  resolved_instructor uuid;
  resolved_tenant uuid;
  rows_claimed integer;
BEGIN
  inv := public.gw_resolve_invite(p_token);
  IF inv.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'invalid_invite',
      'error', 'This invitation link is no longer valid.');
  END IF;

  SELECT * INTO service_record
    FROM public.gw_services WHERE id = inv.service_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'service_inactive',
      'error', 'This meeting type is no longer available.');
  END IF;

  -- The invite carries the tenant; the service is the fallback. Never the
  -- guest's (nonexistent) session.
  resolved_tenant := COALESCE(inv.tenant_id, service_record.tenant_id);

  availability_check := public.check_appointment_availability(
    inv.service_id, p_appointment_date, p_start_time, service_record.duration_minutes
  );

  IF NOT (availability_check->>'available')::BOOLEAN THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'slot_taken',
      'error', coalesce(availability_check->>'error', 'That time was just taken.'));
  END IF;

  UPDATE public.gw_booking_invites
     SET booked_at = now(), updated_at = now()
   WHERE id = inv.id AND booked_at IS NULL;
  GET DIAGNOSTICS rows_claimed = ROW_COUNT;

  IF rows_claimed = 0 THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'already_booked',
      'error', 'This invitation has already been used to book a time.');
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

  resolved_instructor := service_record.created_by;
  IF resolved_instructor IS NULL AND service_record.provider_id IS NOT NULL THEN
    SELECT user_id INTO resolved_instructor
      FROM public.gw_service_providers WHERE id = service_record.provider_id;
  END IF;

  INSERT INTO public.gw_appointments (
    title, description, appointment_date, duration_minutes, status, appointment_type,
    client_name, client_email, client_phone, notes,
    created_by, service_id, instructor_user_id, assigned_to, tenant_id
  ) VALUES (
    service_record.name || ' - ' || inv.invitee_name,
    p_notes,
    appointment_timestamp,
    service_record.duration_minutes,
    CASE WHEN service_record.requires_approval THEN 'pending' ELSE 'confirmed' END,
    resolved_type,
    inv.invitee_name,
    inv.invitee_email,
    p_phone,
    p_notes,
    inv.created_by,
    inv.service_id,
    resolved_instructor,
    resolved_instructor,
    resolved_tenant
  ) RETURNING id INTO new_appointment_id;

  UPDATE public.gw_booking_invites
     SET appointment_id = new_appointment_id,
         invitee_phone = nullif(trim(coalesce(p_phone, '')), ''),
         updated_at = now()
   WHERE id = inv.id;

  RETURN jsonb_build_object(
    'success', true,
    'appointment_id', new_appointment_id,
    'status', CASE WHEN service_record.requires_approval THEN 'pending' ELSE 'confirmed' END,
    'service_name', service_record.name,
    'location', service_record.location,
    'duration_minutes', service_record.duration_minutes,
    'appointment_date', p_appointment_date,
    'start_time', p_start_time,
    'message', CASE
      WHEN service_record.requires_approval THEN 'Your request was submitted for confirmation.'
      ELSE 'Your meeting is confirmed.'
    END
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.book_appointment_with_invite(text, date, time, text, text) TO anon, authenticated;

-- Adopt any guest bookings already stranded with a NULL tenant.
UPDATE public.gw_appointments a
   SET tenant_id = s.tenant_id
  FROM public.gw_services s
 WHERE a.tenant_id IS NULL
   AND s.id = a.service_id
   AND s.tenant_id IS NOT NULL;
