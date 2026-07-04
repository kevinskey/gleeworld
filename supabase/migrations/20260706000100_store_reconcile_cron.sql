-- Orphan pending-order reconciliation sweep.
-- Stripe checkout sessions that are abandoned (buyer closes tab, card declines
-- silently, webhook never fires) leave gw_store_orders rows stuck in
-- 'pending' forever. This sweeps any 'pending' order older than 2 hours to
-- 'failed' so admin dashboards and inventory logic stop treating it as live.
CREATE OR REPLACE FUNCTION public.gw_store_reconcile_pending() RETURNS integer
LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
  WITH upd AS (
    UPDATE public.gw_store_orders SET status='failed', updated_at=now()
    WHERE status='pending' AND created_at < now() - interval '2 hours' RETURNING 1
  ) SELECT count(*)::int FROM upd;
$$;
REVOKE ALL ON FUNCTION public.gw_store_reconcile_pending() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gw_store_reconcile_pending() TO service_role;

-- Schedule via pg_cron in environments where the extension is installed
-- (production/self-hosted Supabase). The scratch/dev DB used for migration
-- tests does not have pg_cron, so this is guarded to keep the migration
-- idempotent and runnable everywhere.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'gw-store-reconcile',
      '*/15 * * * *',
      'SELECT public.gw_store_reconcile_pending()'
    );
  END IF;
END $$;
