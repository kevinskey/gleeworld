-- Public intake: anonymous appointment booking and audition submission.
--
-- Rate-limit ledger for public-intake. Written ONLY by the edge function
-- under the service role, so RLS is enabled with no permissive policy —
-- anon and authenticated are denied by default, service_role bypasses RLS.
CREATE TABLE IF NOT EXISTS public.gw_public_intake_attempts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  source_ip   text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gw_public_intake_attempts ENABLE ROW LEVEL SECURITY;

-- Both lookups are "within the last hour", so the time column leads.
CREATE INDEX IF NOT EXISTS idx_public_intake_attempts_email
  ON public.gw_public_intake_attempts (created_at DESC, email);
CREATE INDEX IF NOT EXISTS idx_public_intake_attempts_ip
  ON public.gw_public_intake_attempts (created_at DESC, source_ip);

COMMENT ON TABLE public.gw_public_intake_attempts IS
  'Rate-limit ledger for the public-intake edge function. Service-role only. '
  'Rows older than 24h are disposable.';

-- Per-tenant welcome SMS copy. One build serves every tenant, so this text
-- can never live in the frontend bundle. {org_name} and {first_name} are
-- substituted at send time; anything else is emitted literally.
ALTER TABLE public.gw_branding_settings
  ADD COLUMN IF NOT EXISTS welcome_sms_template text;

COMMENT ON COLUMN public.gw_branding_settings.welcome_sms_template IS
  'Welcome SMS sent after a public appointment booking or audition. '
  'Placeholders: {org_name}, {first_name}. NULL falls back to '
  '"Thanks for joining {org_name}!".';

-- The public booking page renders open slots before the visitor has any
-- session. Read-only, and it exposes nothing the appointment block does not
-- already advertise publicly.
GRANT EXECUTE ON FUNCTION public.get_available_time_slots(uuid, date, integer)
  TO anon;

-- Deliberately NOT granted to anon: public.book_appointment. Every public
-- booking goes through the public-intake edge function so the rate limit
-- cannot be bypassed by calling the RPC directly.
