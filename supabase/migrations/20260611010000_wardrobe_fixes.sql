-- Wardrobe vet fixes (2026-06-11)
-- 1. book_appointment writes status 'pending' when a service requires
--    approval, and the SMS approval flow uses 'pending_approval' — neither
--    was allowed by gw_appointments_status_check, so those inserts failed.
-- 2. The RLS select policy references appointment_type = 'public_booking',
--    which the type constraint never allowed.
-- 3. gw_services had no rows, so the wardrobe fitting booking flow had
--    nothing to book against.

ALTER TABLE public.gw_appointments DROP CONSTRAINT IF EXISTS gw_appointments_status_check;
ALTER TABLE public.gw_appointments ADD CONSTRAINT gw_appointments_status_check
CHECK (status = ANY (ARRAY[
  'scheduled'::text, 'confirmed'::text, 'cancelled'::text, 'completed'::text,
  'pending'::text, 'pending_approval'::text
]));

ALTER TABLE public.gw_appointments DROP CONSTRAINT IF EXISTS gw_appointments_appointment_type_check;
ALTER TABLE public.gw_appointments ADD CONSTRAINT gw_appointments_appointment_type_check
CHECK (appointment_type = ANY (ARRAY[
  'general'::text, 'meeting'::text, 'member-meeting'::text, 'exec-meeting'::text,
  'voice-lesson'::text, 'tutorial'::text, 'consultation'::text, 'rehearsal'::text,
  'audition'::text, 'other'::text, 'Wardrobe Fitting'::text, 'public_booking'::text
]));

DO $$
DECLARE
  v_tenant uuid;
  v_service uuid;
  v_dow integer;
BEGIN
  SELECT id INTO v_service FROM public.gw_services WHERE name = 'Wardrobe Fitting';
  IF v_service IS NULL THEN
    SELECT tenant_id INTO v_tenant FROM public.gw_profiles WHERE tenant_id IS NOT NULL LIMIT 1;
    INSERT INTO public.gw_services (
      name, description, duration_minutes, category,
      is_active, requires_approval, price_display, tenant_id
    ) VALUES (
      'Wardrobe Fitting', 'Costume and wardrobe fitting appointment', 30, 'styling',
      true, false, 'Free', v_tenant
    ) RETURNING id INTO v_service;
  END IF;

  -- Weekday availability 9:00-18:00; without rows here
  -- check_appointment_availability rejects every booking.
  FOR v_dow IN 1..5 LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.gw_service_availability
      WHERE service_id = v_service AND day_of_week = v_dow
    ) THEN
      INSERT INTO public.gw_service_availability (service_id, day_of_week, start_time, end_time, is_active)
      VALUES (v_service, v_dow, '09:00:00', '18:00:00', true);
    END IF;
  END LOOP;
END $$;
