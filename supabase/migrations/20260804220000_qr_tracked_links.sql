-- Trackable QR links: resolve a token, log the scan, hand back the destination.
--
-- `gw_qr_codes` / `gw_qr_scans` were built for exactly this and then never
-- wired to anything (0 rows, referenced only in the generated types). This
-- adds the one missing piece — a public resolver — so a QR printed on a poster
-- can point at /q/<token> on the tenant's own domain instead of straight at
-- the destination, and we learn how many people actually scanned it.
--
-- Deliberately NOT touching the two neighbouring models: `gw_attendance_qr_codes`
-- (live, attendance check-in) and `qr_scan_logs` (feeds QRScanHistory /
-- QRAnalytics). Those stay attendance-specific; this is the generic one.
--
-- SECURITY DEFINER because the scanner is anonymous and must be able to
-- increment a counter and insert a scan row for a tenant it has no session
-- with. It is a narrow surface: given a token it returns only the destination
-- URL and title, and it refuses inactive, expired, or used-up codes.

-- Scans are read per-code and per-tenant on the admin screen; the existing
-- index on qr_code_id covers the first, this covers "recent scans for tenant".
CREATE INDEX IF NOT EXISTS idx_gw_qr_scans_tenant_scanned_at
  ON public.gw_qr_scans (tenant_id, scanned_at DESC);

CREATE OR REPLACE FUNCTION public.gw_qr_resolve_scan(
  p_token      TEXT,
  p_user_agent TEXT DEFAULT NULL,
  p_referrer   TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_code RECORD;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) = 0 THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  -- Lock the row so two simultaneous scans can't both slip past max_scans.
  SELECT * INTO v_code
    FROM gw_qr_codes
   WHERE qr_token = trim(p_token)
   FOR UPDATE;

  IF v_code IS NULL OR NOT v_code.is_active THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    RETURN jsonb_build_object('error', 'expired');
  END IF;
  IF v_code.max_scans IS NOT NULL AND v_code.scan_count >= v_code.max_scans THEN
    RETURN jsonb_build_object('error', 'limit_reached');
  END IF;

  -- Only ever hand back an http(s) destination. The content column is written
  -- by an admin, but a stored `javascript:` or `data:` URL would turn every
  -- printed code into a redirect gadget, so the check lives here rather than
  -- relying on the browser to refuse it.
  IF v_code.content !~* '^https?://' THEN
    RETURN jsonb_build_object('error', 'bad_destination');
  END IF;

  -- scan_count is NOT incremented here. An existing AFTER INSERT trigger on
  -- gw_qr_scans (update_qr_scan_count_trigger) already maintains it; doing it
  -- here too counted every scan twice. The SELECT ... FOR UPDATE above still
  -- serialises concurrent scans so the max_scans check can't be raced.
  INSERT INTO gw_qr_scans (qr_code_id, tenant_id, user_id, user_agent, additional_data)
  VALUES (
    v_code.id,
    v_code.tenant_id,
    auth.uid(),                                   -- null for an anonymous scan
    left(COALESCE(p_user_agent, ''), 500),
    jsonb_build_object('referrer', left(COALESCE(p_referrer, ''), 300))
  );

  RETURN jsonb_build_object(
    'ok',    true,
    'url',   v_code.content,
    'title', v_code.title
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.gw_qr_resolve_scan(TEXT, TEXT, TEXT)
  TO anon, authenticated, service_role;

-- Admin-side summary: every tracked code for the caller's tenant with its
-- scan count and when it was last hit. Kept as an RPC so the list is one round
-- trip instead of an N+1 over gw_qr_scans.
CREATE OR REPLACE FUNCTION public.gw_qr_list_tracked()
RETURNS TABLE (
  id           UUID,
  title        TEXT,
  qr_token     TEXT,
  content      TEXT,
  is_active    BOOLEAN,
  scan_count   INTEGER,
  created_at   TIMESTAMPTZ,
  last_scan_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY INVOKER          -- RLS decides what this caller may see
SET search_path = public, pg_temp
AS $$
  SELECT c.id, c.title, c.qr_token, c.content, c.is_active, c.scan_count, c.created_at,
         (SELECT max(s.scanned_at) FROM gw_qr_scans s WHERE s.qr_code_id = c.id)
    FROM gw_qr_codes c
   -- The table's CHECK constraints fix the vocabulary; 'url' + 'marketing' is
   -- what this feature writes, and it keeps attendance codes out of the list.
   WHERE c.qr_type = 'url' AND c.context_type = 'marketing'
   ORDER BY c.created_at DESC
   LIMIT 200;
$$;

GRANT EXECUTE ON FUNCTION public.gw_qr_list_tracked() TO authenticated, service_role;
