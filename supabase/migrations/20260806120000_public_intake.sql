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

-- Both lookups are "how many attempts has THIS caller made recently" —
-- equality on email/source_ip plus a range on created_at. The equality
-- column must lead so the index descends straight to one caller's rows;
-- leading with created_at would force a scan filtering every recent
-- attempt from every caller. If an earlier version of this migration
-- already created these indexes with the old (created_at, ...) column
-- order, drop them first so CREATE INDEX IF NOT EXISTS doesn't silently
-- leave the wrong order in place.
DROP INDEX IF EXISTS idx_public_intake_attempts_email;
DROP INDEX IF EXISTS idx_public_intake_attempts_ip;
CREATE INDEX IF NOT EXISTS idx_public_intake_attempts_email
  ON public.gw_public_intake_attempts (email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_intake_attempts_ip
  ON public.gw_public_intake_attempts (source_ip, created_at DESC);

COMMENT ON TABLE public.gw_public_intake_attempts IS
  'Rate-limit ledger for the public-intake edge function. Service-role only. '
  'Rows accumulate; nothing in this migration prunes them.';

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
