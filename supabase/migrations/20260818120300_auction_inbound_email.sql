-- Auctions — tier-2 ingestion: auction-house notification email.
--
-- The houses send these to us, which is what makes reading them legitimate
-- where scraping their sites would not be. Mail arrives at
-- auctions@inbound.gleeworld.org, Resend receives it and calls the
-- auctions-inbound webhook, and every message lands here VERBATIM before
-- anything tries to interpret it.
--
-- Landing raw first is the whole point of this table. Parsing rules for
-- eight houses' wildly different formats will be wrong at first; storing the
-- original means a bad parse can be re-run rather than losing the notice,
-- and a message nobody can parse yet is still visible to a human.
--
-- Global and staff-only, like the rest of the ingestion layer: this is
-- platform plumbing, not tenant data.
--
-- Self-hosted: record-only; apply by hand as supabase_admin.
--   ssh root@198.211.113.144 "docker exec -i supabase-db psql -U supabase_admin \
--     -d postgres -v ON_ERROR_STOP=1" < this-file.sql
--
-- Do NOT add --single-transaction; this file opens its own BEGIN/COMMIT.

BEGIN;

CREATE TABLE IF NOT EXISTS public.ext_auction_inbound_emails (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Resend's id for the received message. Unique so a webhook retry (which
  -- Resend will do if we time out) re-runs harmlessly instead of duplicating.
  provider          text NOT NULL DEFAULT 'resend',
  provider_email_id text NOT NULL,
  message_id        text,

  from_address      text,
  to_address        text,
  subject           text,
  -- Verbatim. Never rewritten, for the same reason lots keep their raw text.
  text_body         text,
  html_body         text,
  received_at       timestamptz NOT NULL DEFAULT now(),

  -- Which house this appears to be from, matched on the sending domain.
  -- NULL means unrecognised, which is a review item rather than an error.
  source_id         uuid REFERENCES public.ext_auction_sources(id) ON DELETE SET NULL,

  status            text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','parsed','no_auction','needs_review','ignored','failed')),
  parse_problems    text[] NOT NULL DEFAULT '{}',
  parsed_auction_id uuid REFERENCES public.ext_auctions(id) ON DELETE SET NULL,
  lots_created      int NOT NULL DEFAULT 0,
  processed_at      timestamptz,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ext_auction_inbound_emails_provider_uq UNIQUE (provider, provider_email_id)
);

-- The parser's work queue.
CREATE INDEX IF NOT EXISTS ext_auction_inbound_emails_pending_idx
  ON public.ext_auction_inbound_emails (received_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS ext_auction_inbound_emails_recent_idx
  ON public.ext_auction_inbound_emails (received_at DESC);
CREATE INDEX IF NOT EXISTS ext_auction_inbound_emails_source_idx
  ON public.ext_auction_inbound_emails (source_id, received_at DESC);

DROP TRIGGER IF EXISTS trg_ext_auction_inbound_emails_updated_at ON public.ext_auction_inbound_emails;
CREATE TRIGGER trg_ext_auction_inbound_emails_updated_at
  BEFORE UPDATE ON public.ext_auction_inbound_emails
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Staff only, both directions. Inbound mail can contain anything a sender
-- chose to put in it, so it is not member-readable at all — members see
-- auctions and lots, never the raw correspondence that produced them.
ALTER TABLE public.ext_auction_inbound_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ext_auction_inbound_emails_staff ON public.ext_auction_inbound_emails;
CREATE POLICY ext_auction_inbound_emails_staff ON public.ext_auction_inbound_emails
  FOR ALL TO authenticated
  USING (public.is_platform_owner()) WITH CHECK (public.is_platform_owner());

REVOKE ALL ON public.ext_auction_inbound_emails FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ext_auction_inbound_emails TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
