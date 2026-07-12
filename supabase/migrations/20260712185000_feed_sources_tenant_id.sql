-- Codify the gw_feed_sources.tenant_id column that production already has.
--
-- The per-tenant Feed Control rework (2026-07-12) shipped its column to the
-- live DB out-of-band (the intended 20260712180000 migration was superseded
-- and never landed in the repo), leaving repo/DB drift: generated types and
-- fresh databases lack the column while fetch-news-feeds and the
-- 20260712190000 unique constraint depend on it. This migration converges a
-- fresh DB with production; on production every statement is a no-op.

ALTER TABLE public.gw_feed_sources
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.gw_tenants(id);
-- types regen pending

-- Tenant backfill trigger (same set_tenant_id_default() used platform-wide)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.gw_feed_sources'::regclass AND tgname = 'trg_set_tenant_id'
  ) THEN
    CREATE TRIGGER trg_set_tenant_id
      BEFORE INSERT ON public.gw_feed_sources
      FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default();
  END IF;
END $$;
