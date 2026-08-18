-- WhatsApp alerts for saved auction searches.
--
-- Two things shape this schema, and neither is technical:
--
-- 1. Meta requires EXPLICIT, recorded opt-in before a business may message
--    someone, and expects you to be able to show when it was given. A phone
--    number sitting in a profile is not consent. So consent gets its own row
--    with its own timestamp, and withdrawing it is recorded rather than
--    deleted — "they opted out on the 3rd" is the answer to a complaint.
--
-- 2. There are already THREE phone columns on this platform (gw_profiles.phone,
--    gw_profiles.phone_number, gw_notification_preferences.phone_number), all
--    but empty — 4 of 848 profiles. Adding a fourth general phone field would
--    make that worse. This stores the number it was actually given consent
--    for, in E.164, which is the only form Twilio accepts.
--
-- notify_whatsapp is a separate boolean rather than another notify_channel
-- value on purpose: the existing enum ('none','in_app','email','both') cannot
-- express "email AND WhatsApp", and widening it would have meant rewriting
-- every branch that reads it.
--
-- Self-hosted: record-only; apply by hand as supabase_admin, WITHOUT
-- --single-transaction (this file opens its own BEGIN/COMMIT).

BEGIN;

ALTER TABLE public.gw_auction_saved_searches
  ADD COLUMN IF NOT EXISTS notify_whatsapp boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.gw_auction_saved_searches.notify_whatsapp IS
  'Send this search''s digest to WhatsApp as well. Orthogonal to '
  'notify_channel, and inert unless the owner has a live opt-in.';

CREATE TABLE IF NOT EXISTS public.gw_whatsapp_optins (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id),
  user_id      uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  -- E.164 only: +14045551234. Twilio rejects anything else, and storing the
  -- typed form would mean re-guessing the country code at send time.
  phone_e164   text NOT NULL CHECK (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  opted_in_at  timestamptz NOT NULL DEFAULT now(),
  -- Set rather than deleted: the record of when consent ended is the point.
  opted_out_at timestamptz,
  -- Stamped when the number has actually received a message successfully.
  last_sent_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  -- One live consent per person. A second number replaces the first.
  CONSTRAINT gw_whatsapp_optins_user_uq UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS gw_whatsapp_optins_live_idx
  ON public.gw_whatsapp_optins (user_id) WHERE opted_out_at IS NULL;
CREATE INDEX IF NOT EXISTS gw_whatsapp_optins_tenant_idx
  ON public.gw_whatsapp_optins (tenant_id);

DROP TRIGGER IF EXISTS trg_gw_whatsapp_optins_tenant_default ON public.gw_whatsapp_optins;
CREATE TRIGGER trg_gw_whatsapp_optins_tenant_default
  BEFORE INSERT ON public.gw_whatsapp_optins
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default();

DROP TRIGGER IF EXISTS trg_gw_whatsapp_optins_updated_at ON public.gw_whatsapp_optins;
CREATE TRIGGER trg_gw_whatsapp_optins_updated_at
  BEFORE UPDATE ON public.gw_whatsapp_optins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.gw_whatsapp_optins ENABLE ROW LEVEL SECURITY;

-- Tenant fence, then owner-private. Deliberately no admin-read policy: a
-- personal phone number and its consent record are not roster data.
DROP POLICY IF EXISTS gw_whatsapp_optins_isolation ON public.gw_whatsapp_optins;
CREATE POLICY gw_whatsapp_optins_isolation ON public.gw_whatsapp_optins
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS gw_whatsapp_optins_owner ON public.gw_whatsapp_optins;
CREATE POLICY gw_whatsapp_optins_owner ON public.gw_whatsapp_optins
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

REVOKE ALL ON public.gw_whatsapp_optins FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gw_whatsapp_optins TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
