-- Schedule the Auctions background jobs.
--
-- Calling an edge function from pg_cron needs the service-role key, and the
-- obvious way to do that puts a master credential inline in four cron.job
-- rows — visible in any `SELECT * FROM cron.job`, and needing all four
-- rewritten at the next key rotation. So the key lives once in a locked-down
-- table and a SECURITY DEFINER helper reads it. The schedule below therefore
-- contains no secret at all, which is why it can be committed.
--
-- The key itself is NOT in this file. Insert it by hand after applying:
--   INSERT INTO private.gw_platform_secrets (name, value)
--   VALUES ('service_role_key', '<key>')
--   ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
--
-- TIMING: every LLM-spending job runs OFF-PEAK for DeepSeek, which charges
-- double from 01:00-04:00 and 06:00-10:00 UTC. Everything here sits outside
-- both windows.
--
-- Self-hosted: record-only; apply by hand as supabase_admin, WITHOUT
-- --single-transaction (this file opens its own BEGIN/COMMIT).

BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;

-- Not reachable through PostgREST (its schema is not exposed) and readable
-- only by the definer function below.
CREATE TABLE IF NOT EXISTS private.gw_platform_secrets (
  name       text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.gw_platform_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.gw_platform_secrets FROM anon, authenticated;

COMMENT ON TABLE private.gw_platform_secrets IS
  'Credentials pg_cron needs to call edge functions. Deliberately outside the '
  'exposed schemas and with no RLS policy, so only SECURITY DEFINER functions '
  'can read it. Rotating a key is one UPDATE here, not a re-schedule.';

-- One place that knows how to call an edge function from inside the database.
CREATE OR REPLACE FUNCTION private.invoke_edge_function(p_fn text, p_body jsonb DEFAULT '{}'::jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public, net, pg_temp
AS $fn$
DECLARE
  v_key text;
BEGIN
  SELECT value INTO v_key FROM private.gw_platform_secrets WHERE name = 'service_role_key';
  IF v_key IS NULL OR v_key = '' THEN
    RAISE EXCEPTION 'service_role_key is not set in private.gw_platform_secrets';
  END IF;

  -- kong is the internal gateway on the compose network; no public round trip.
  RETURN net.http_post(
    url     := 'http://kong:8000/functions/v1/' || p_fn,
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || v_key),
    body    := p_body
  );
END
$fn$;

REVOKE ALL ON FUNCTION private.invoke_edge_function(text, jsonb) FROM PUBLIC, anon, authenticated;

-- ── The schedule ──────────────────────────────────────────────────────────
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron not installed — skipping schedule';
    RETURN;
  END IF;

  PERFORM cron.unschedule(jobname)
    FROM cron.job
   WHERE jobname IN ('auctions-parse-email','auctions-normalize','auctions-match','auctions-digest');

  -- Read inbound auction email into sales and lots. Four times a day: the
  -- houses send on their own timetable, and a 24-hour lag on a catalog notice
  -- can cost a whole auction.
  PERFORM cron.schedule('auctions-parse-email', '30 11,15,19,23 * * *',
    $$SELECT private.invoke_edge_function('auctions-parse-email')$$);

  -- Read each new lot's specs. Every 20 minutes across the off-peak
  -- afternoon/evening, NOT once a day: the job stops itself at 35s to avoid
  -- the runtime's 60s kill (see _shared/jobDeadline), so it drains a backlog
  -- across several runs rather than in one. A daily-only schedule would leave
  -- a real catalog queued for days, invisible to members the whole time.
  PERFORM cron.schedule('auctions-normalize', '*/20 12-23 * * *',
    $$SELECT private.invoke_edge_function('auctions-normalize')$$);

  -- Score new lots against saved searches. Hourly — this one costs nothing
  -- but database time, so there is no reason to make people wait.
  PERFORM cron.schedule('auctions-match', '5 * * * *',
    $$SELECT private.invoke_edge_function('auctions-match')$$);

  -- Send the digests. Three times a day, which lets an 'instant' search feel
  -- prompt; 'daily' and 'weekly' searches gate themselves inside the function
  -- on last_notified_at, so this cannot over-send.
  PERFORM cron.schedule('auctions-digest', '0 13,17,21 * * *',
    $$SELECT private.invoke_edge_function('auctions-digest')$$);
END $do$;

COMMIT;

NOTIFY pgrst, 'reload schema';
