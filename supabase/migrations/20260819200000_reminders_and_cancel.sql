-- Reminders, and guest-initiated cancel / reschedule.
--
-- Both hang off the invite token, because the guest has no account and the
-- token is the only thing that identifies them. Neither acts on a GET: mail
-- scanners prefetch every link in a message, so a cancel link that cancelled
-- on load would silently wipe bookings nobody touched. The links land on a
-- page with a confirm button, exactly like booking does.

-- ── Reminder bookkeeping ─────────────────────────────────────────────────
-- Timestamps rather than booleans so a stuck job is diagnosable: you can see
-- when each side actually went out.
ALTER TABLE public.gw_appointments
  ADD COLUMN IF NOT EXISTS reminder_24h_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_1h_sent_at  TIMESTAMPTZ;

-- The reminder sweep filters on these constantly; without an index it is a
-- full scan of every appointment ever booked, every 15 minutes.
CREATE INDEX IF NOT EXISTS gw_appointments_reminder_sweep_idx
  ON public.gw_appointments (appointment_date)
  WHERE status = 'confirmed';

-- ── Cancel / reschedule ──────────────────────────────────────────────────
-- Returns the freed appointment id so the caller (an edge function holding
-- the service role) can tidy up the Google event, which SQL cannot reach.
--
-- The invite is returned to an unused state rather than being burned. Someone
-- who cancels usually wants a different time, not to withdraw — and a fresh
-- token in their inbox would be a worse experience than the link they already
-- have. p_mode is recorded only to distinguish the two in the response.
CREATE OR REPLACE FUNCTION public.cancel_invite_booking(
  p_token text,
  p_mode text DEFAULT 'cancel',
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  inv public.gw_booking_invites;
  appt RECORD;
BEGIN
  SELECT * INTO inv FROM public.gw_booking_invites WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'invalid_invite',
      'error', 'This link is no longer valid.');
  END IF;

  IF inv.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'revoked',
      'error', 'This invitation was withdrawn.');
  END IF;

  IF inv.booked_at IS NULL OR inv.appointment_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'not_booked',
      'error', 'There is no booking on this invitation to change.');
  END IF;

  SELECT * INTO appt FROM public.gw_appointments WHERE id = inv.appointment_id;

  UPDATE public.gw_appointments
     SET status = 'cancelled',
         cancelled_at = now(),
         cancellation_reason = COALESCE(nullif(trim(p_reason), ''),
           CASE WHEN p_mode = 'reschedule' THEN 'Rescheduled by guest'
                ELSE 'Cancelled by guest' END),
         updated_at = now()
   WHERE id = inv.appointment_id;

  -- Reopen the invite so the same link can pick a new time.
  UPDATE public.gw_booking_invites
     SET booked_at = NULL,
         appointment_id = NULL,
         confirmation_sent_at = NULL,
         updated_at = now()
   WHERE id = inv.id;

  RETURN jsonb_build_object(
    'success', true,
    'mode', p_mode,
    'cancelled_appointment_id', inv.appointment_id,
    'instructor_google_event_id', appt.instructor_google_event_id,
    'student_google_event_id', appt.student_google_event_id,
    'invitee_name', inv.invitee_name,
    'invitee_email', inv.invitee_email,
    'was_at', appt.appointment_date
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.cancel_invite_booking(text, text, text) TO anon, authenticated;

-- ── Reminder queue ───────────────────────────────────────────────────────
-- One query the sweeper can call, so the window arithmetic lives next to the
-- data rather than being duplicated in Deno. Generous windows (a 2-hour band
-- for the 24h notice, 30 minutes for the 1h) mean a missed cron tick still
-- results in a reminder rather than a silent gap.
CREATE OR REPLACE FUNCTION public.appointments_due_for_reminder()
RETURNS TABLE(
  appointment_id uuid,
  kind text,
  client_name text,
  client_email text,
  client_phone text,
  appointment_date timestamptz,
  duration_minutes integer,
  meeting_url text,
  service_name text,
  host_user_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT a.id, '24h', a.client_name, a.client_email, a.client_phone,
         a.appointment_date, a.duration_minutes, a.meeting_url,
         s.name, COALESCE(a.instructor_user_id, a.assigned_to, a.created_by)
    FROM public.gw_appointments a
    LEFT JOIN public.gw_services s ON s.id = a.service_id
   WHERE a.status = 'confirmed'
     AND a.reminder_24h_sent_at IS NULL
     AND a.appointment_date BETWEEN now() + interval '23 hours'
                                AND now() + interval '25 hours'
  UNION ALL
  SELECT a.id, '1h', a.client_name, a.client_email, a.client_phone,
         a.appointment_date, a.duration_minutes, a.meeting_url,
         s.name, COALESCE(a.instructor_user_id, a.assigned_to, a.created_by)
    FROM public.gw_appointments a
    LEFT JOIN public.gw_services s ON s.id = a.service_id
   WHERE a.status = 'confirmed'
     AND a.reminder_1h_sent_at IS NULL
     AND a.appointment_date BETWEEN now() + interval '45 minutes'
                                AND now() + interval '75 minutes';
$function$;

REVOKE ALL ON FUNCTION public.appointments_due_for_reminder() FROM anon, authenticated;
