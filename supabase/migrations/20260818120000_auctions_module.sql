-- Auctions module — Phase 1: the auction calendar.
--
-- Tracks used medical/diagnostic equipment auctions (MRI, CT, C-arm,
-- ultrasound, X-ray, lab analyzers) across auction houses. Phase 1 is the
-- calendar alone: which houses run which sales, when they open and close,
-- and — the actionable part — when the catalog drops. Lots, saved searches,
-- and the landed-cost calculator arrive in later phases.
--
-- POSTURE: these two tables are PLATFORM-GLOBAL, not tenant-scoped. The same
-- auction at the same house is the same fact for every tenant, so this follows
-- the ext_catalog_items precedent (20260727120000_ext_catalog_items.sql):
-- no tenant_id, readable by any authenticated user, writable only by platform
-- staff via is_platform_owner(). Personal data built on top of these — saved
-- searches, matches, watchlists — is tenant-fenced and owner-private, and
-- lands in the Phase 2 migration.
--
-- Because there is no tenant_id, these names deliberately do NOT carry the
-- gw_ prefix: scripts/audit-tenant-isolation.sql keys off `tablename LIKE
-- 'gw\_%'`, and a global table showing up there reads as a missing-isolation
-- finding rather than an intentional exception.
--
-- Self-hosted: record-only; apply by hand as supabase_admin.
--   ssh root@198.211.113.144 "docker exec -i supabase-db psql -U supabase_admin \
--     -d postgres -v ON_ERROR_STOP=1" < this-file.sql
--
-- Note the absence of --single-transaction: this file opens its own
-- BEGIN/COMMIT, and nesting the two makes the inner COMMIT close the outer
-- transaction early (psql warns "there is already a transaction in progress").
-- The file is atomic on its own. Verified end to end on a scratch postgres:16
-- with stubbed platform objects: applies clean, re-runs clean, and the
-- constraints and RLS policies were exercised individually.

BEGIN;

-- ── ext_auction_sources — the auction houses ──────────────────────────────
-- ingest_method records HOW a source's data reaches us, and the UI shows it
-- so a user can tell hand-entered data from an API feed. Tiers are never
-- mixed silently. buyer_premium_pct lives here because the premium is a
-- property of the house; the Phase 3 landed-cost calculator reads it.
CREATE TABLE IF NOT EXISTS public.ext_auction_sources (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  slug              text NOT NULL UNIQUE,
  base_url          text,
  ingest_method     text NOT NULL DEFAULT 'manual'
    CHECK (ingest_method IN ('manual','email','api','feed')),
  -- Buyer's premium as a percentage (e.g. 18.00 = 18%). Nullable: unknown is
  -- not the same as zero, and the calculator must not silently assume 0%.
  buyer_premium_pct numeric(5,2) CHECK (buyer_premium_pct >= 0 AND buyer_premium_pct <= 100),
  -- Terms-of-service position for this house is recorded here, per the
  -- module's no-scraping rule: a source that forbids automated access stays
  -- on the manual or email tier.
  notes             text,
  active            boolean NOT NULL DEFAULT true,
  -- When this source's data was last known-good, so the UI can show staleness.
  last_refreshed_at timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ext_auction_sources_active_idx
  ON public.ext_auction_sources (active, name) WHERE active;

-- ── ext_auctions — a single sale run by a house ───────────────────────────
CREATE TABLE IF NOT EXISTS public.ext_auctions (
  id                  uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id           uuid NOT NULL REFERENCES public.ext_auction_sources(id) ON DELETE CASCADE,
  -- The house's own identifier, when it has one. NULL for hand-entered sales.
  external_id         text,
  title               text NOT NULL,
  location_city       text,
  location_state      text,
  opens_at            timestamptz,
  closes_at           timestamptz,
  catalog_url         text,
  -- The headline field of Phase 1. Several houses post inventory only ~3 days
  -- before an auction opens, so "the catalog is out" is the alert that
  -- actually matters — more than the close date.
  catalog_released_at timestamptz,
  status              text NOT NULL DEFAULT 'announced'
    CHECK (status IN ('announced','catalog_posted','open','closed','cancelled')),
  -- What this sale is expected to carry. An empty array means a general sale
  -- (never filtered out by modality) rather than "carries nothing".
  modality_focus      text[] NOT NULL DEFAULT '{}'
    CHECK (modality_focus <@ ARRAY['mri','ct','c_arm','ultrasound','xray','lab_analyzer','other']::text[]),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CHECK (closes_at IS NULL OR opens_at IS NULL OR closes_at >= opens_at)
);

-- Partial unique: an API/feed source must not ingest the same sale twice,
-- but hand-entered auctions have no external_id and several may share NULL.
CREATE UNIQUE INDEX IF NOT EXISTS ext_auctions_source_external_uq
  ON public.ext_auctions (source_id, external_id) WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ext_auctions_opens_idx   ON public.ext_auctions (opens_at);
CREATE INDEX IF NOT EXISTS ext_auctions_closes_idx  ON public.ext_auctions (closes_at);
CREATE INDEX IF NOT EXISTS ext_auctions_catalog_idx ON public.ext_auctions (catalog_released_at);
CREATE INDEX IF NOT EXISTS ext_auctions_source_idx  ON public.ext_auctions (source_id, opens_at DESC);

-- ── updated_at triggers (shared helper: public.update_updated_at_column) ──
DROP TRIGGER IF EXISTS trg_ext_auction_sources_updated_at ON public.ext_auction_sources;
CREATE TRIGGER trg_ext_auction_sources_updated_at
  BEFORE UPDATE ON public.ext_auction_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_ext_auctions_updated_at ON public.ext_auctions;
CREATE TRIGGER trg_ext_auctions_updated_at
  BEFORE UPDATE ON public.ext_auctions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── RLS: everyone signed in reads; only platform staff writes ─────────────
-- Same posture as gw_all_state_* (20260808280000): global reference data that
-- members consume and platform staff curate. anon gets nothing — the calendar
-- is a signed-in surface, and the public subscription path is the tokenised
-- ICS feed edge function, which uses the service-role client.
DO $do$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ext_auction_sources','ext_auctions'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_read', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)',
      t || '_read', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_staff_write', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated '
      'USING (public.is_platform_owner()) WITH CHECK (public.is_platform_owner())',
      t || '_staff_write', t);

    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
  END LOOP;
END $do$;

-- ── Seed: the major houses, curated by hand ───────────────────────────────
-- Deliberately manual. It is reliable and immediately valuable, and it keeps
-- every source on a tier its terms of service allow. ToS position goes in
-- notes as each house is reviewed; buyer_premium_pct stays NULL until it is
-- confirmed from the house's own published terms, because a guessed premium
-- would silently corrupt the Phase 3 landed-cost math.
INSERT INTO public.ext_auction_sources (name, slug, base_url, ingest_method, notes)
VALUES
  ('GSA Auctions', 'gsa-auctions', 'https://gsaauctions.gov',
   'manual', 'US federal surplus. Public API available — candidate for the Phase 3 API tier. ToS: not yet reviewed.'),
  ('GovDeals', 'govdeals', 'https://www.govdeals.com',
   'manual', 'Liquidity Services. Partner program worth an integration request. ToS: not yet reviewed; no automated access until it is.'),
  ('Public Surplus', 'public-surplus', 'https://www.publicsurplus.com',
   'manual', 'Government and institutional surplus, incl. hospital districts. ToS: not yet reviewed.'),
  ('AllSurplus', 'allsurplus', 'https://www.allsurplus.com',
   'manual', 'Liquidity Services marketplace. ToS: not yet reviewed.'),
  ('Heritage Global Partners', 'heritage-global', 'https://www.hgpauction.com',
   'manual', 'Industrial and healthcare asset sales. Publishes schedules well ahead. ToS: not yet reviewed.'),
  ('Bidspotter', 'bidspotter', 'https://www.bidspotter.com',
   'manual', 'Aggregator hosting many industrial/medical houses. ToS: not yet reviewed.'),
  ('Hilco Industrial', 'hilco-industrial', 'https://www.hilcoglobal.com',
   'manual', 'Asset disposition, incl. imaging from closed facilities. ToS: not yet reviewed.'),
  ('Centurion Service Group', 'centurion-service', 'https://www.centurionservice.com',
   'manual', 'Medical-equipment specialist; frequent imaging lots. ToS: not yet reviewed.')
ON CONFLICT (slug) DO NOTHING;

-- ── Billing catalog row ───────────────────────────────────────────────────
-- $0 while add-on billing is disengaged (see
-- 20260710190000_addons_free_until_billing_launch.sql). The id 'auctions'
-- must match ModuleGate moduleId, the nav gate, and toModuleFlags().
INSERT INTO public.gw_billing_modules
  (id, name, description, tier, category, icon, monthly_price_cents, is_active, sort_order)
VALUES (
  'auctions',
  'Auctions',
  'Track used medical and diagnostic equipment auctions across auction houses: a calendar of upcoming sales with catalog release dates, calendar subscriptions, and — in later phases — saved searches, alerts, and landed-cost planning.',
  'addon',
  'calendar',
  'Gavel',
  0,
  true,
  76
)
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      tier = EXCLUDED.tier,
      category = EXCLUDED.category,
      icon = EXCLUDED.icon,
      is_active = EXCLUDED.is_active,
      sort_order = EXCLUDED.sort_order;

COMMIT;

NOTIFY pgrst, 'reload schema';
