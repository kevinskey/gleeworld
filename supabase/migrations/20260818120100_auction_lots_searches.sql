-- Auctions module — Phase 2: lots, saved searches, matches, watchlists.
--
-- Phase 1 shipped the calendar (which sales happen when). Phase 2 adds the
-- individual lots inside those sales, lets a buyer describe what they are
-- hunting for, and matches new lots against those descriptions.
--
-- POSTURE, which splits down the middle:
--   ext_auction_lots + ext_auction_llm_usage are PLATFORM-GLOBAL, like the
--   Phase 1 tables — a lot is the same fact for every tenant.
--   gw_auction_saved_searches / _matches / _watchlist are TENANT-FENCED and
--   OWNER-PRIVATE — what someone is shopping for is nobody else's business,
--   not even their director's. Same posture as planner notes.
--
-- Self-hosted: record-only; apply by hand as supabase_admin.
--   ssh root@198.211.113.144 "docker exec -i supabase-db psql -U supabase_admin \
--     -d postgres -v ON_ERROR_STOP=1" < this-file.sql
--
-- Do NOT add --single-transaction; this file opens its own BEGIN/COMMIT.

BEGIN;

-- Shared tenant-backfill trigger fn: create only if absent. CREATE OR REPLACE
-- fails with "must be owner" on this stack, so this guards on pg_proc instead
-- (same shape as 20260711120000_planner_module.sql).
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'set_tenant_id_default' AND n.nspname = 'public'
  ) THEN
    CREATE FUNCTION public.set_tenant_id_default() RETURNS trigger
    LANGUAGE plpgsql SET search_path = public, pg_temp
    AS $fn$
    BEGIN
      IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id := public.current_tenant_id();
      END IF;
      RETURN NEW;
    END
    $fn$;
  END IF;
END $do$;

-- ── ext_auction_lots — one item inside a sale ─────────────────────────────
-- raw_title/raw_text are what the house published, verbatim and permanent.
-- Everything else in the middle block is DERIVED by the normalizer and may be
-- rewritten at any time. A trigger below enforces that split, because the
-- moment raw text becomes editable, re-normalization stops being reproducible
-- and there is no longer any ground truth to compare against.
CREATE TABLE IF NOT EXISTS public.ext_auction_lots (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id               uuid NOT NULL REFERENCES public.ext_auctions(id) ON DELETE CASCADE,
  lot_number               text,

  -- Immutable source text.
  raw_title                text NOT NULL,
  raw_text                 text,

  -- Derived fields. NULL means "not yet normalized", not "absent".
  modality                 text
    CHECK (modality IS NULL OR modality IN ('mri','ct','c_arm','ultrasound','xray','lab_analyzer','other')),
  manufacturer             text,
  model                    text,
  year_of_manufacture      int CHECK (year_of_manufacture IS NULL OR year_of_manufacture BETWEEN 1950 AND 2100),
  serial                   text,
  condition_notes          text,

  current_bid_cents        bigint CHECK (current_bid_cents IS NULL OR current_bid_cents >= 0),
  currency                 text NOT NULL DEFAULT 'USD',
  closes_at                timestamptz,
  url                      text,

  normalized_at            timestamptz,
  normalization_confidence numeric(4,3)
    CHECK (normalization_confidence IS NULL OR (normalization_confidence >= 0 AND normalization_confidence <= 1)),
  -- Low-confidence extractions wait for a human instead of quietly polluting
  -- everyone's saved-search results. Only 'auto' and 'approved' are matchable.
  review_status            text NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending','auto','needs_review','approved','rejected')),
  reviewed_at              timestamptz,
  reviewed_by              uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- The search path saved searches take: modality first, then make/model.
CREATE INDEX IF NOT EXISTS ext_auction_lots_spec_idx
  ON public.ext_auction_lots (modality, manufacturer, model);
CREATE INDEX IF NOT EXISTS ext_auction_lots_closes_idx
  ON public.ext_auction_lots (closes_at);
CREATE INDEX IF NOT EXISTS ext_auction_lots_auction_idx
  ON public.ext_auction_lots (auction_id, lot_number);
-- The normalizer's work queue.
CREATE INDEX IF NOT EXISTS ext_auction_lots_unnormalized_idx
  ON public.ext_auction_lots (created_at) WHERE normalized_at IS NULL;
-- The admin review queue.
CREATE INDEX IF NOT EXISTS ext_auction_lots_review_idx
  ON public.ext_auction_lots (created_at DESC) WHERE review_status = 'needs_review';
-- Free-text fallback for people searching wording the normalizer did not map.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS ext_auction_lots_title_trgm_idx
  ON public.ext_auction_lots USING gin (raw_title gin_trgm_ops);

-- A house may reuse lot numbers across sales, but not within one sale.
CREATE UNIQUE INDEX IF NOT EXISTS ext_auction_lots_auction_lot_uq
  ON public.ext_auction_lots (auction_id, lot_number) WHERE lot_number IS NOT NULL;

-- Raw source text is write-once. Normalization writes only derived columns.
CREATE OR REPLACE FUNCTION public.ext_auction_lots_protect_raw()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $fn$
BEGIN
  IF NEW.raw_title IS DISTINCT FROM OLD.raw_title
     OR NEW.raw_text IS DISTINCT FROM OLD.raw_text THEN
    RAISE EXCEPTION
      'ext_auction_lots.raw_title/raw_text are immutable; normalization writes derived columns only';
  END IF;
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS trg_ext_auction_lots_protect_raw ON public.ext_auction_lots;
CREATE TRIGGER trg_ext_auction_lots_protect_raw
  BEFORE UPDATE ON public.ext_auction_lots
  FOR EACH ROW EXECUTE FUNCTION public.ext_auction_lots_protect_raw();

DROP TRIGGER IF EXISTS trg_ext_auction_lots_updated_at ON public.ext_auction_lots;
CREATE TRIGGER trg_ext_auction_lots_updated_at
  BEFORE UPDATE ON public.ext_auction_lots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── ext_auction_llm_usage — what the normalizer costs ─────────────────────
-- Spend is observable from day one, per the module's cost discipline. Global
-- and staff-only: this is platform operating cost, not tenant data.
CREATE TABLE IF NOT EXISTS public.ext_auction_llm_usage (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_run_id            uuid NOT NULL,
  provider              text NOT NULL DEFAULT 'deepseek',
  model                 text NOT NULL,
  lots_processed        int NOT NULL DEFAULT 0,
  prompt_tokens         int NOT NULL DEFAULT 0,
  cached_prompt_tokens  int NOT NULL DEFAULT 0,
  completion_tokens     int NOT NULL DEFAULT 0,
  -- Micro-cents: a single normalization call costs a fraction of one cent,
  -- and rounding each one to whole cents would report the spend as zero.
  estimated_cost_microcents bigint NOT NULL DEFAULT 0,
  ok                    boolean NOT NULL DEFAULT true,
  error_detail          text,
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ext_auction_llm_usage_run_idx
  ON public.ext_auction_llm_usage (job_run_id);
CREATE INDEX IF NOT EXISTS ext_auction_llm_usage_created_idx
  ON public.ext_auction_llm_usage (created_at DESC);

-- ── RLS for the global tables ─────────────────────────────────────────────
-- Lots: any signed-in user reads, but ONLY matchable ones. Pending and
-- rejected extractions stay behind the staff policy so a half-parsed lot
-- never reaches a member's search results.
DO $do$
BEGIN
  EXECUTE 'ALTER TABLE public.ext_auction_lots ENABLE ROW LEVEL SECURITY';

  DROP POLICY IF EXISTS ext_auction_lots_read ON public.ext_auction_lots;
  CREATE POLICY ext_auction_lots_read ON public.ext_auction_lots
    FOR SELECT TO authenticated
    USING (review_status IN ('auto','approved'));

  DROP POLICY IF EXISTS ext_auction_lots_staff_write ON public.ext_auction_lots;
  CREATE POLICY ext_auction_lots_staff_write ON public.ext_auction_lots
    FOR ALL TO authenticated
    USING (public.is_platform_owner()) WITH CHECK (public.is_platform_owner());

  EXECUTE 'REVOKE ALL ON public.ext_auction_lots FROM anon';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.ext_auction_lots TO authenticated';

  EXECUTE 'ALTER TABLE public.ext_auction_llm_usage ENABLE ROW LEVEL SECURITY';

  DROP POLICY IF EXISTS ext_auction_llm_usage_staff ON public.ext_auction_llm_usage;
  CREATE POLICY ext_auction_llm_usage_staff ON public.ext_auction_llm_usage
    FOR ALL TO authenticated
    USING (public.is_platform_owner()) WITH CHECK (public.is_platform_owner());

  EXECUTE 'REVOKE ALL ON public.ext_auction_llm_usage FROM anon';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.ext_auction_llm_usage TO authenticated';
END $do$;

-- ── gw_auction_saved_searches — what a buyer is hunting for ───────────────
-- criteria shape:
--   { modality: [], manufacturer: [], model_contains: '', year_min: 0,
--     max_hammer_cents: 0, states: [], radius_miles: 0, origin_zip: '',
--     condition: [] }
CREATE TABLE IF NOT EXISTS public.gw_auction_saved_searches (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id),
  user_id          uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name             text NOT NULL,
  criteria         jsonb NOT NULL DEFAULT '{}'::jsonb,
  notify_channel   text NOT NULL DEFAULT 'in_app'
    CHECK (notify_channel IN ('none','in_app','email','both')),
  notify_frequency text NOT NULL DEFAULT 'daily'
    CHECK (notify_frequency IN ('instant','daily','weekly')),
  active           boolean NOT NULL DEFAULT true,
  last_run_at      timestamptz,
  last_notified_at timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gw_auction_saved_searches_owner_idx
  ON public.gw_auction_saved_searches (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS gw_auction_saved_searches_tenant_idx
  ON public.gw_auction_saved_searches (tenant_id);
CREATE INDEX IF NOT EXISTS gw_auction_saved_searches_active_idx
  ON public.gw_auction_saved_searches (active, last_run_at) WHERE active;

-- ── gw_auction_matches — a lot that met a saved search ────────────────────
-- user_id and tenant_id are denormalized from the parent search deliberately:
-- an RLS policy that reached back into gw_auction_saved_searches would make
-- the two tables' policies reference each other, and self-referential policy
-- scans are how this codebase has hit 42P17 before.
CREATE TABLE IF NOT EXISTS public.gw_auction_matches (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id),
  user_id          uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  saved_search_id  uuid NOT NULL REFERENCES public.gw_auction_saved_searches(id) ON DELETE CASCADE,
  lot_id           uuid NOT NULL REFERENCES public.ext_auction_lots(id) ON DELETE CASCADE,
  score            numeric(5,2) NOT NULL DEFAULT 0,
  notified_at      timestamptz,
  dismissed_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  -- The never-notify-twice guarantee, enforced by the database rather than by
  -- the job remembering to check.
  CONSTRAINT gw_auction_matches_search_lot_uq UNIQUE (saved_search_id, lot_id)
);
CREATE INDEX IF NOT EXISTS gw_auction_matches_owner_idx
  ON public.gw_auction_matches (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS gw_auction_matches_tenant_idx
  ON public.gw_auction_matches (tenant_id);
CREATE INDEX IF NOT EXISTS gw_auction_matches_unnotified_idx
  ON public.gw_auction_matches (saved_search_id, created_at) WHERE notified_at IS NULL;

-- ── gw_auction_watchlist — lots someone is following ──────────────────────
CREATE TABLE IF NOT EXISTS public.gw_auction_watchlist (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id),
  user_id               uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  lot_id                uuid NOT NULL REFERENCES public.ext_auction_lots(id) ON DELETE CASCADE,
  notify_minutes_before int[] NOT NULL DEFAULT '{1440,60}',
  notified_marks        int[] NOT NULL DEFAULT '{}',
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gw_auction_watchlist_user_lot_uq UNIQUE (user_id, lot_id)
);
CREATE INDEX IF NOT EXISTS gw_auction_watchlist_owner_idx
  ON public.gw_auction_watchlist (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS gw_auction_watchlist_tenant_idx
  ON public.gw_auction_watchlist (tenant_id);

-- ── Tenant defaults + updated_at + owner-private RLS ──────────────────────
DO $do$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'gw_auction_saved_searches','gw_auction_matches','gw_auction_watchlist'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'trg_' || t || '_tenant_default', t);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT ON public.%I '
      'FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default()',
      'trg_' || t || '_tenant_default', t);

    -- The tenant fence.
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_isolation', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated '
      'USING (tenant_id = public.current_tenant_id()) '
      'WITH CHECK (tenant_id = public.current_tenant_id())',
      t || '_isolation', t);

    -- Owner-private. No admin-read policy on purpose: what equipment someone
    -- is shopping for is personal, the same call the planner module made.
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_owner', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated '
      'USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())',
      t || '_owner', t);

    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
  END LOOP;
END $do$;

DROP TRIGGER IF EXISTS trg_gw_auction_saved_searches_updated_at ON public.gw_auction_saved_searches;
CREATE TRIGGER trg_gw_auction_saved_searches_updated_at
  BEFORE UPDATE ON public.gw_auction_saved_searches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;

NOTIFY pgrst, 'reload schema';
