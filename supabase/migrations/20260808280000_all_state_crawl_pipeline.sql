-- All-State Phase 4: crawl → fingerprint → check → stage → review.
--
-- Division of labour with the Firecrawl monitors (which stay): monitors are
-- the SCHEDULED layer — they watch 105 URLs on a cadence and email when the
-- AI judge sees a real change. This pipeline is the STRUCTURED layer — it
-- re-fetches a source on demand, fingerprints it, checks every published
-- claim that cites it, and turns discrepancies into reviewable change rows
-- with Accept/Dismiss actions. An email says "look at Georgia"; this says
-- "the Nov 7 region audition date no longer appears on the page — downgrade
-- or dismiss?".
--
-- The brief's rules, and where they land:
--   hash before extract        → sources.last_content_hash, checked first
--   crawls never delete        → they write gw_all_state_changes, nothing else
--   extraction failure ≠ change→ health_status='unavailable', no change rows
--   field-level provenance     → change rows carry source, snapshot, and row id
--   respect the sites          → one fetch per source, on demand or via the
--                                already-rate-limited monitors
--
-- What the checker DETECTS today is deliberately deterministic: a published
-- claim's date no longer present on its cited page (in any common US format),
-- and season-rollover markers. Proposing NEW values needs the LLM extraction
-- stage; the schema (staged_extractions) is ready for it, but shipping a
-- guessed date into a review queue is worse than shipping "this date
-- disappeared, go look" until that extractor has its own verification.

BEGIN;

-- Source health, per the brief's vocabulary.
ALTER TABLE public.gw_all_state_sources
  ADD COLUMN IF NOT EXISTS crawl_enabled     boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_crawled_at   timestamptz,
  ADD COLUMN IF NOT EXISTS last_success_at   timestamptz,
  ADD COLUMN IF NOT EXISTS last_content_hash text,
  ADD COLUMN IF NOT EXISTS health_status     text NOT NULL DEFAULT 'unknown'
    CHECK (health_status IN ('unknown','healthy','changed','unavailable','redirected','needs_review'));

-- Fingerprinted page captures. Content is kept inline (markdown, tens of KB)
-- with a hard retention policy enforced by the crawler: the latest THREE
-- snapshots per source, older ones deleted. The brief's "do not accumulate
-- full page bodies indefinitely", made concrete.
CREATE TABLE IF NOT EXISTS public.gw_all_state_snapshots (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id    uuid NOT NULL REFERENCES public.gw_all_state_sources(id) ON DELETE CASCADE,
  url          text NOT NULL,
  fetched_at   timestamptz NOT NULL DEFAULT now(),
  content_hash text NOT NULL,
  content      text,
  parse_status text NOT NULL DEFAULT 'ok' CHECK (parse_status IN ('ok','error')),
  error        text
);
CREATE INDEX IF NOT EXISTS idx_gw_as_snapshots_source ON public.gw_all_state_snapshots(source_id, fetched_at DESC);

-- Ready for the future LLM extractor; unused by the deterministic checker.
CREATE TABLE IF NOT EXISTS public.gw_all_state_staged_extractions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id         uuid NOT NULL REFERENCES public.gw_all_state_sources(id) ON DELETE CASCADE,
  snapshot_id       uuid REFERENCES public.gw_all_state_snapshots(id) ON DELETE SET NULL,
  program_id        uuid REFERENCES public.gw_all_state_programs(id) ON DELETE SET NULL,
  payload           jsonb NOT NULL,
  schema_version    int NOT NULL DEFAULT 1,
  extracted_at      timestamptz NOT NULL DEFAULT now(),
  validation_status text NOT NULL DEFAULT 'pending'
    CHECK (validation_status IN ('pending','valid','invalid')),
  validation_errors jsonb
);

-- The review queue. A change row PROPOSES; only an admin action publishes.
CREATE TABLE IF NOT EXISTS public.gw_all_state_changes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id       uuid REFERENCES public.gw_all_state_states(id) ON DELETE CASCADE,
  program_id     uuid REFERENCES public.gw_all_state_programs(id) ON DELETE CASCADE,
  date_id        uuid REFERENCES public.gw_all_state_dates(id) ON DELETE CASCADE,
  source_id      uuid REFERENCES public.gw_all_state_sources(id) ON DELETE SET NULL,
  snapshot_id    uuid REFERENCES public.gw_all_state_snapshots(id) ON DELETE SET NULL,
  change_type    text NOT NULL CHECK (change_type IN ('date_not_found','season_rollover','source_error')),
  field_path     text,
  previous_value text,
  new_value      text,
  detail         text,
  detected_at    timestamptz NOT NULL DEFAULT now(),
  status         text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','verified','rejected','published')),
  reviewed_at    timestamptz,
  reviewed_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  -- One OPEN row per (date, type): re-crawls refresh detected_at rather than
  -- stacking duplicates. Enforced by the partial unique index below.
  UNIQUE (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS gw_as_changes_open_uniq
  ON public.gw_all_state_changes(date_id, change_type) WHERE status = 'pending' AND date_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gw_as_changes_pending
  ON public.gw_all_state_changes(status, detected_at DESC);

-- All three are GLOBAL (Layer 1 infrastructure): no tenant_id, platform staff
-- only. Same posture as the canon they guard.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['gw_all_state_snapshots','gw_all_state_staged_extractions','gw_all_state_changes'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_staff', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated '
                   'USING (public.is_platform_owner()) WITH CHECK (public.is_platform_owner())',
                   t || '_staff', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
  END LOOP;
END $$;

COMMIT;
NOTIFY pgrst, 'reload schema';
