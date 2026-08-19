-- Public booking invites — token-gated self-serve scheduling for people who
-- do NOT have a GleeWorld account (guest conductors, teachers, clinicians).
--
-- Studio Hours already owns the source of truth for availability
-- (gw_services + gw_service_availability + gw_appointments). Nothing here
-- forks that logic: the slot RPC delegates to get_available_time_slots and the
-- booking RPC re-checks with check_appointment_availability, so a guest and a
-- logged-in student are always racing against the same numbers.
--
-- Security model: the invite token IS the credential. Anon may call these three
-- functions and nothing else; each one dead-ends unless the token resolves to a
-- live, unexpired, unused invite. The table itself stays closed to anon.

CREATE TABLE IF NOT EXISTS public.gw_booking_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  service_id UUID NOT NULL REFERENCES public.gw_services(id) ON DELETE CASCADE,
  invitee_name TEXT NOT NULL,
  invitee_email TEXT NOT NULL,
  -- Free-text grouping so one outreach push ("Children Go Where I Send Thee")
  -- can be listed, resent, and reported on as a unit.
  campaign TEXT,
  -- Shown at the top of the booking page so the invitee knows what this is.
  message TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  -- Set once the invitee books. Booked invites become read-only receipts.
  appointment_id UUID REFERENCES public.gw_appointments(id) ON DELETE SET NULL,
  booked_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  last_sent_at TIMESTAMPTZ,
  send_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  -- Scoped from day one. Tables added after the isolation rollout have a habit
  -- of shipping without this and quietly leaking across tenants.
  tenant_id UUID DEFAULT current_tenant_id(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_booking_invites_token_idx
  ON public.gw_booking_invites(token);
CREATE INDEX IF NOT EXISTS gw_booking_invites_campaign_idx
  ON public.gw_booking_invites(campaign);
CREATE INDEX IF NOT EXISTS gw_booking_invites_created_by_idx
  ON public.gw_booking_invites(created_by);
CREATE INDEX IF NOT EXISTS gw_booking_invites_tenant_idx
  ON public.gw_booking_invites(tenant_id);

-- Fill tenant_id from the parent service, which is authoritative, before
-- falling back to the session tenant.
CREATE OR REPLACE FUNCTION public.gw_booking_invites_fill_tenant()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT s.tenant_id INTO NEW.tenant_id
      FROM public.gw_services s WHERE s.id = NEW.service_id;
  END IF;
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := current_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gw_booking_invites_fill_tenant_trg ON public.gw_booking_invites;
CREATE TRIGGER gw_booking_invites_fill_tenant_trg
  BEFORE INSERT ON public.gw_booking_invites
  FOR EACH ROW EXECUTE FUNCTION public.gw_booking_invites_fill_tenant();

ALTER TABLE public.gw_booking_invites ENABLE ROW LEVEL SECURITY;

-- Only the person who sent the invite (or an admin) can see or manage it.
-- Anon never touches this table directly; it goes through the RPCs below.
DROP POLICY IF EXISTS "Owners and admins manage booking invites" ON public.gw_booking_invites;
CREATE POLICY "Owners and admins manage booking invites"
  ON public.gw_booking_invites
  FOR ALL
  TO authenticated
  USING (created_by = auth.uid() OR public.is_admin_user())
  WITH CHECK (created_by = auth.uid() OR public.is_admin_user());

-- Restrictive tenant gate on top: even an admin only ever sees their own
-- tenant's invites.
DROP POLICY IF EXISTS "Booking invites tenant isolation" ON public.gw_booking_invites;
CREATE POLICY "Booking invites tenant isolation"
  ON public.gw_booking_invites
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (tenant_id IS NOT DISTINCT FROM current_tenant_id())
  WITH CHECK (tenant_id IS NOT DISTINCT FROM current_tenant_id());

-- ── Token generator ───────────────────────────────────────────────────────
-- URL-safe, 32 chars of base64url from 24 random bytes. Long enough that
-- guessing one is not a practical attack against a handful of live invites.
CREATE OR REPLACE FUNCTION public.gw_generate_invite_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  candidate TEXT;
BEGIN
  LOOP
    candidate := replace(replace(replace(
      encode(gen_random_bytes(24), 'base64'), '+', '-'), '/', '_'), '=', '');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.gw_booking_invites WHERE token = candidate);
  END LOOP;
  RETURN candidate;
END;
$function$;

-- ── Invite creation (authenticated instructors) ───────────────────────────
CREATE OR REPLACE FUNCTION public.create_booking_invite(
  p_service_id uuid,
  p_invitee_name text,
  p_invitee_email text,
  p_campaign text DEFAULT NULL,
  p_message text DEFAULT NULL,
  p_expires_in_days integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_token TEXT;
  new_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.gw_services WHERE id = p_service_id AND is_active = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Service not found or inactive');
  END IF;

  IF coalesce(trim(p_invitee_email), '') = '' OR p_invitee_email NOT LIKE '%@%' THEN
    RETURN jsonb_build_object('success', false, 'error', 'A valid invitee email is required');
  END IF;

  new_token := public.gw_generate_invite_token();

  INSERT INTO public.gw_booking_invites (
    token, service_id, invitee_name, invitee_email, campaign, message, expires_at, created_by
  ) VALUES (
    new_token,
    p_service_id,
    coalesce(nullif(trim(p_invitee_name), ''), split_part(p_invitee_email, '@', 1)),
    lower(trim(p_invitee_email)),
    nullif(trim(p_campaign), ''),
    nullif(trim(p_message), ''),
    now() + (greatest(coalesce(p_expires_in_days, 30), 1) || ' days')::INTERVAL,
    auth.uid()
  ) RETURNING id INTO new_id;

  RETURN jsonb_build_object('success', true, 'invite_id', new_id, 'token', new_token);
END;
$function$;

-- ── Internal: resolve a token to a usable invite ──────────────────────────
-- Returns NULL when the token is unknown, revoked, expired, or already booked.
CREATE OR REPLACE FUNCTION public.gw_resolve_invite(p_token text)
RETURNS public.gw_booking_invites
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT *
    FROM public.gw_booking_invites
   WHERE token = p_token
     AND revoked_at IS NULL
     AND expires_at > now()
     AND booked_at IS NULL
   LIMIT 1;
$function$;

-- ── Public: what is this invite for? ──────────────────────────────────────
-- Deliberately returns a status string rather than raising, so the page can
-- render a real explanation ("this time was already booked") instead of a
-- generic error. Exposes only what the invitee already knows plus the service.
CREATE OR REPLACE FUNCTION public.get_invite_booking_context(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  inv RECORD;
  svc RECORD;
  appt RECORD;
BEGIN
  SELECT * INTO inv FROM public.gw_booking_invites WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  SELECT id, name, description, duration_minutes, location, instructor
    INTO svc FROM public.gw_services WHERE id = inv.service_id;

  IF inv.booked_at IS NOT NULL THEN
    SELECT appointment_date, duration_minutes, status
      INTO appt FROM public.gw_appointments WHERE id = inv.appointment_id;

    RETURN jsonb_build_object(
      'status', 'booked',
      'invitee_name', inv.invitee_name,
      'invitee_email', inv.invitee_email,
      'message', inv.message,
      'service', to_jsonb(svc),
      'appointment', to_jsonb(appt)
    );
  END IF;

  IF inv.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'revoked');
  END IF;

  IF inv.expires_at <= now() THEN
    RETURN jsonb_build_object('status', 'expired');
  END IF;

  RETURN jsonb_build_object(
    'status', 'open',
    'invitee_name', inv.invitee_name,
    'invitee_email', inv.invitee_email,
    'message', inv.message,
    'expires_at', inv.expires_at,
    'service', to_jsonb(svc)
  );
END;
$function$;

-- ── Public: live slots for this invite ────────────────────────────────────
-- Walks p_days forward from today (America/New_York) and delegates each day to
-- the existing get_available_time_slots, so anything a student books inside
-- Studio Hours disappears here on the very next poll.
CREATE OR REPLACE FUNCTION public.get_invite_available_slots(
  p_token text,
  p_days integer DEFAULT 21
)
RETURNS TABLE(slot_date date, start_time time, end_time time, available boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  inv public.gw_booking_invites;
  day_cursor DATE;
  last_day DATE;
BEGIN
  inv := public.gw_resolve_invite(p_token);
  IF inv.id IS NULL THEN
    RETURN;
  END IF;

  day_cursor := (now() AT TIME ZONE 'America/New_York')::DATE;
  last_day := day_cursor + (least(greatest(coalesce(p_days, 21), 1), 90) || ' days')::INTERVAL;

  WHILE day_cursor <= last_day LOOP
    RETURN QUERY
      SELECT day_cursor, s.start_time, s.end_time, s.available
        FROM public.get_available_time_slots(inv.service_id, day_cursor, NULL) s
       WHERE s.available = true;
    day_cursor := day_cursor + 1;
  END LOOP;
END;
$function$;

-- ── Public: book with an invite ───────────────────────────────────────────
-- Mirrors book_appointment, but attributes the row to the invitee rather than
-- auth.uid() (there is no session) and burns the invite in the same statement.
-- The re-check against check_appointment_availability is what makes the
-- one-click email links safe: two teachers clicking the same slot second-apart
-- means the second one gets 'slot_taken' and a fresh grid, not a double-book.
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

  availability_check := public.check_appointment_availability(
    inv.service_id, p_appointment_date, p_start_time, service_record.duration_minutes
  );

  IF NOT (availability_check->>'available')::BOOLEAN THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'slot_taken',
      'error', coalesce(availability_check->>'error', 'That time was just taken.'));
  END IF;

  -- Claim the invite BEFORE inserting. A second concurrent click finds
  -- booked_at already set and bails out instead of writing a second row.
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
    created_by, service_id, instructor_user_id, assigned_to
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
    inv.created_by,          -- credit the host; the guest has no auth.uid()
    inv.service_id,
    resolved_instructor,
    resolved_instructor
  ) RETURNING id INTO new_appointment_id;

  UPDATE public.gw_booking_invites
     SET appointment_id = new_appointment_id, updated_at = now()
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

-- ── Grants ────────────────────────────────────────────────────────────────
-- Anon gets exactly the three token-gated entry points and nothing more.
REVOKE ALL ON FUNCTION public.gw_resolve_invite(text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.gw_generate_invite_token() FROM anon;

GRANT EXECUTE ON FUNCTION public.get_invite_booking_context(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_invite_available_slots(text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.book_appointment_with_invite(text, date, time, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking_invite(uuid, text, text, text, text, integer) TO authenticated;
