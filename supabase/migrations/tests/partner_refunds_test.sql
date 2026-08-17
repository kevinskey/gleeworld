-- supabase/migrations/tests/partner_refunds_test.sql
-- Run against a DB with 20260817160000 + 20260817160100 applied.
BEGIN;
DO $$
BEGIN
  ASSERT (SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gw_partner_order_items'
      AND column_name IN ('refunded_at','stripe_refund_id')) = 2,
    'refund columns missing on gw_partner_order_items';

  -- Public read of partner scores must require an ACTIVE partner (suspend
  -- enforcement lives in this policy, not in the frontend).
  ASSERT (SELECT qual LIKE '%gw_partners%' AND qual LIKE '%active%' FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'gw_partner_scores'
      AND policyname = 'gw_partner_scores_public_read'),
    'public read policy missing active-partner filter';

  -- Owner/admin policies untouched (suspended partners keep portal access).
  ASSERT (SELECT count(*) FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'gw_partner_scores'
      AND policyname IN ('gw_partner_scores_owner_all','gw_partner_scores_admin_all')) = 2,
    'owner/admin policies missing';

  -- repertoire_search gained the gw-store arm.
  ASSERT (SELECT prosrc LIKE '%gw-store%' AND prosrc LIKE '%gw_partner_scores%'
    FROM pg_proc WHERE proname = 'repertoire_search'),
    'repertoire_search missing gw-store arm';
END $$;

-- Behavioral: the gw-store arm surfaces published scores of active partners
-- and hides them once the partner is suspended. Uses existing prod-ish data
-- when present; skips cleanly on an empty DB.
DO $$
DECLARE
  v_partner uuid;
  v_before  int;
  v_after   int;
BEGIN
  SELECT p.id INTO v_partner
  FROM gw_partners p
  JOIN gw_partner_scores s ON s.partner_id = p.id AND s.status = 'published'
  WHERE p.status = 'active'
  LIMIT 1;

  IF v_partner IS NULL THEN
    RAISE NOTICE 'no active partner with published scores — skipping behavioral check';
    RETURN;
  END IF;

  SELECT count(*) INTO v_before FROM repertoire_search(p_source => 'gw-store');
  ASSERT v_before > 0, 'expected gw-store rows for active partner';

  UPDATE gw_partners SET status = 'suspended' WHERE id = v_partner;
  SELECT count(*) INTO v_after FROM repertoire_search(p_source => 'gw-store')
    WHERE publisher = (SELECT display_name FROM gw_partners WHERE id = v_partner);
  ASSERT v_after = 0, 'suspended partner scores must vanish from search';
END $$;
ROLLBACK;
