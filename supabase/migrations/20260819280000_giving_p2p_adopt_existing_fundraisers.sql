-- Reconcile the Giving (peer-to-peer) build with the gw_fundraisers table
-- that ALREADY existed in the database.
--
-- What happened: 20260819270000 created gw_fundraisers with CREATE TABLE IF
-- NOT EXISTS. A gw_fundraisers table was already there — an item-sale
-- fundraiser (gw_fundraiser_items, fee_percent, payout_cadence,
-- gw_members_store_orders) that no repo migration ever created; it exists
-- only in the database and was retro-fenced by 20260808140000. So the CREATE
-- was skipped, the three new tables (gw_donations,
-- gw_fundraiser_participants, gw_fundraiser_groups) were built with foreign
-- keys into that legacy table, and every RPC referencing f.title failed.
--
-- Decision: ADOPT the existing table rather than introduce a second,
-- competing "fundraiser" concept. One campaign can then have both an item
-- catalog and donation pages, which is what a booster program actually
-- wants. This migration adds the donation-side columns and rebuilds every
-- RPC against the real column names.
--
-- Column mapping (legacy → what 270000 assumed):
--     name        → title
--     description → story
--     cover_image → hero_image_url
--     opens_at    → starts_at
--     closes_at   → ends_at
--     status 'active' → 'live'
-- The RPCs alias these back to the names the frontend already consumes, so
-- the public read contract is unchanged.

-- ── Donation-side columns on the existing table ────────────────────────────

ALTER TABLE public.gw_fundraisers
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'usd',
  ADD COLUMN IF NOT EXISTS allow_participants BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS default_participant_goal_cents INTEGER NOT NULL DEFAULT 20000,
  ADD COLUMN IF NOT EXISTS fee_cover_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS fee_cover_bps INTEGER NOT NULL DEFAULT 320,
  ADD COLUMN IF NOT EXISTS min_gift_cents INTEGER NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS max_gift_cents INTEGER NOT NULL DEFAULT 1000000,
  ADD COLUMN IF NOT EXISTS suggested_amounts_cents INTEGER[] NOT NULL DEFAULT ARRAY[2500,5000,10000,25000],
  ADD COLUMN IF NOT EXISTS tax_deductible BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ein TEXT,
  ADD COLUMN IF NOT EXISTS receipt_note TEXT,
  ADD COLUMN IF NOT EXISTS is_indexable BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS raised_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS donor_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.gw_fundraisers
  DROP CONSTRAINT IF EXISTS gw_fundraisers_fee_cover_bps_check;
ALTER TABLE public.gw_fundraisers
  ADD CONSTRAINT gw_fundraisers_fee_cover_bps_check CHECK (fee_cover_bps BETWEEN 0 AND 1000);

-- A /give/<slug> link is shared into a text message with no subdomain or
-- tenant header to resolve against, so the slug alone has to identify the
-- campaign. The legacy table is only UNIQUE(tenant_id, slug). Fail loudly
-- with the offending slugs rather than silently leaving the public route
-- ambiguous.
DO $$
DECLARE v_dupes TEXT;
BEGIN
  SELECT string_agg(slug, ', ') INTO v_dupes
    FROM (SELECT slug FROM public.gw_fundraisers GROUP BY slug HAVING count(*) > 1) d;
  IF v_dupes IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot make gw_fundraisers.slug globally unique — these slugs are used by more than one tenant: %. Rename them, then re-run.', v_dupes;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS gw_fundraisers_slug_global_key ON public.gw_fundraisers(slug);

-- ── Public read surface, rebuilt against the real columns ──────────────────
-- Return-type changes require a DROP first; CREATE OR REPLACE cannot alter
-- an existing function's OUT parameters.

DROP FUNCTION IF EXISTS public.gw_giving_fundraiser(TEXT);
DROP FUNCTION IF EXISTS public.gw_giving_participants(TEXT, TEXT, INT, INT);
DROP FUNCTION IF EXISTS public.gw_giving_participant(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.gw_giving_groups(TEXT);
DROP FUNCTION IF EXISTS public.gw_giving_top_donations(TEXT, TEXT, INT);
DROP FUNCTION IF EXISTS public.gw_giving_state_totals(TEXT);
DROP FUNCTION IF EXISTS public.gw_giving_participant_by_token(TEXT);

CREATE FUNCTION public.gw_giving_fundraiser(p_slug TEXT)
RETURNS TABLE(
  id UUID, slug TEXT, title TEXT, story TEXT, hero_image_url TEXT,
  goal_cents INTEGER, raised_cents INTEGER, donor_count INTEGER,
  currency TEXT, starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ, status TEXT,
  allow_participants BOOLEAN, participant_count BIGINT,
  fee_cover_enabled BOOLEAN, fee_cover_bps INTEGER,
  min_gift_cents INTEGER, max_gift_cents INTEGER, suggested_amounts_cents INTEGER[],
  tax_deductible BOOLEAN, is_indexable BOOLEAN,
  tenant_slug TEXT, tenant_name TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT f.id, f.slug, f.name, f.description, f.cover_image,
         COALESCE(f.goal_cents, 0), f.raised_cents, f.donor_count,
         f.currency, f.opens_at, f.closes_at,
         -- The frontend's vocabulary is live/closed; the table's is
         -- active/closed. Translate at the boundary so neither side has to
         -- know about the other's history.
         CASE WHEN f.status = 'active' THEN 'live' ELSE f.status END,
         f.allow_participants,
         (SELECT count(*) FROM gw_fundraiser_participants p
           WHERE p.fundraiser_id = f.id AND p.is_public AND p.consent_granted_at IS NOT NULL),
         f.fee_cover_enabled, f.fee_cover_bps,
         f.min_gift_cents, f.max_gift_cents, f.suggested_amounts_cents,
         f.tax_deductible, f.is_indexable,
         t.slug, t.name
    FROM gw_fundraisers f
    JOIN gw_tenants t ON t.id = f.tenant_id
   WHERE f.slug = p_slug
     AND f.status IN ('active','closed');
$$;

CREATE FUNCTION public.gw_giving_participants(
  p_slug TEXT, p_search TEXT DEFAULT NULL, p_limit INT DEFAULT 50, p_offset INT DEFAULT 0
)
RETURNS TABLE(
  slug TEXT, display_name TEXT, grade_label TEXT, photo_url TEXT,
  goal_cents INTEGER, raised_cents INTEGER, donor_count INTEGER, group_name TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT p.slug, p.display_name, p.grade_label, p.photo_url,
         p.goal_cents, p.raised_cents, p.donor_count, g.name
    FROM gw_fundraiser_participants p
    JOIN gw_fundraisers f ON f.id = p.fundraiser_id
    LEFT JOIN gw_fundraiser_groups g ON g.id = p.group_id
   WHERE f.slug = p_slug
     AND f.status IN ('active','closed')
     AND p.is_public
     AND p.consent_granted_at IS NOT NULL
     AND (p_search IS NULL OR p_search = '' OR p.display_name ILIKE '%' || p_search || '%')
   ORDER BY p.raised_cents DESC, p.display_name
   LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200) OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

CREATE FUNCTION public.gw_giving_participant(p_slug TEXT, p_participant_slug TEXT)
RETURNS TABLE(
  id UUID, slug TEXT, display_name TEXT, grade_label TEXT, photo_url TEXT,
  story TEXT, video_url TEXT, goal_cents INTEGER, raised_cents INTEGER,
  donor_count INTEGER, group_name TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT p.id, p.slug, p.display_name, p.grade_label, p.photo_url,
         p.story, p.video_url, p.goal_cents, p.raised_cents, p.donor_count, g.name
    FROM gw_fundraiser_participants p
    JOIN gw_fundraisers f ON f.id = p.fundraiser_id
    LEFT JOIN gw_fundraiser_groups g ON g.id = p.group_id
   WHERE f.slug = p_slug AND p.slug = p_participant_slug
     AND f.status IN ('active','closed')
     AND p.is_public
     AND p.consent_granted_at IS NOT NULL;
$$;

CREATE FUNCTION public.gw_giving_groups(p_slug TEXT)
RETURNS TABLE(id UUID, name TEXT, goal_cents INTEGER, raised_cents INTEGER, donor_count INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT g.id, g.name, g.goal_cents, g.raised_cents, g.donor_count
    FROM gw_fundraiser_groups g
    JOIN gw_fundraisers f ON f.id = g.fundraiser_id
   WHERE f.slug = p_slug AND f.status IN ('active','closed')
   ORDER BY g.sort_order, g.name;
$$;

CREATE FUNCTION public.gw_giving_top_donations(
  p_slug TEXT, p_participant_slug TEXT DEFAULT NULL, p_limit INT DEFAULT 10
)
RETURNS TABLE(donor_label TEXT, amount_cents INTEGER, message TEXT, created_at TIMESTAMPTZ, participant_name TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT CASE WHEN d.is_anonymous OR d.donor_name IS NULL OR d.donor_name = ''
              THEN 'Anonymous' ELSE d.donor_name END,
         CASE WHEN d.hide_amount THEN NULL ELSE d.amount_cents END,
         d.message, d.created_at, p.display_name
    FROM gw_donations d
    JOIN gw_fundraisers f ON f.id = d.fundraiser_id
    LEFT JOIN gw_fundraiser_participants p ON p.id = d.participant_id
   WHERE f.slug = p_slug
     AND f.status IN ('active','closed')
     AND d.status = 'paid'
     AND (p_participant_slug IS NULL OR p.slug = p_participant_slug)
   ORDER BY d.amount_cents DESC, d.created_at DESC
   LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 100);
$$;

CREATE FUNCTION public.gw_giving_state_totals(p_slug TEXT)
RETURNS TABLE(donor_state TEXT, raised_cents BIGINT, donor_count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT d.donor_state, sum(d.amount_cents)::bigint, count(*)::bigint
    FROM gw_donations d
    JOIN gw_fundraisers f ON f.id = d.fundraiser_id
   WHERE f.slug = p_slug AND f.status IN ('active','closed')
     AND d.status = 'paid' AND d.donor_state IS NOT NULL
   GROUP BY d.donor_state;
$$;

CREATE FUNCTION public.gw_giving_participant_by_token(p_token TEXT)
RETURNS TABLE(
  fundraiser_slug TEXT, fundraiser_title TEXT, slug TEXT, display_name TEXT,
  grade_label TEXT, photo_url TEXT, story TEXT, video_url TEXT,
  goal_cents INTEGER, raised_cents INTEGER, is_public BOOLEAN, consent_granted_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT f.slug, f.name, p.slug, p.display_name, p.grade_label, p.photo_url,
         p.story, p.video_url, p.goal_cents, p.raised_cents, p.is_public, p.consent_granted_at
    FROM gw_fundraiser_participants p
    JOIN gw_fundraisers f ON f.id = p.fundraiser_id
   WHERE p.manage_token = p_token AND length(p_token) >= 32;
$$;

REVOKE ALL ON FUNCTION public.gw_giving_fundraiser(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gw_giving_participants(TEXT, TEXT, INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gw_giving_participant(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gw_giving_groups(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gw_giving_top_donations(TEXT, TEXT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gw_giving_state_totals(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gw_giving_participant_by_token(TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.gw_giving_fundraiser(TEXT)                   TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gw_giving_participants(TEXT, TEXT, INT, INT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gw_giving_participant(TEXT, TEXT)            TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gw_giving_groups(TEXT)                       TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gw_giving_top_donations(TEXT, TEXT, INT)     TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gw_giving_state_totals(TEXT)                 TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gw_giving_participant_by_token(TEXT)         TO anon, authenticated, service_role;

-- ── Fulfillment, rebuilt against the real columns ──────────────────────────
-- 270000 created this successfully (PL/pgSQL defers column resolution to
-- runtime) but it would have failed on its first real donation reading
-- v_f.title. Replacing it before any money moves.

CREATE OR REPLACE FUNCTION public.gw_giving_fulfill_donation(
  p_donation_id UUID, p_session_id TEXT, p_payment_intent_id TEXT,
  p_donor_state TEXT DEFAULT NULL, p_donor_country TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_d RECORD; v_f RECORD; v_p RECORD;
BEGIN
  SELECT * INTO v_d FROM gw_donations WHERE id = p_donation_id FOR UPDATE;
  IF v_d IS NULL THEN RETURN jsonb_build_object('error','donation_not_found'); END IF;
  IF v_d.status <> 'pending' THEN
    RETURN jsonb_build_object('already_paid', true, 'donation_id', v_d.id);
  END IF;

  UPDATE gw_donations
     SET status = 'paid',
         provider_session_id = COALESCE(provider_session_id, p_session_id),
         provider_payment_intent_id = COALESCE(p_payment_intent_id, provider_payment_intent_id),
         donor_state = COALESCE(p_donor_state, donor_state),
         donor_country = COALESCE(p_donor_country, donor_country),
         updated_at = now()
   WHERE id = v_d.id;

  SELECT * INTO v_f FROM gw_fundraisers WHERE id = v_d.fundraiser_id;
  SELECT * INTO v_p FROM gw_fundraiser_participants WHERE id = v_d.participant_id;

  RETURN jsonb_build_object(
    'ok', true,
    'donation_id', v_d.id,
    'tenant_id', v_d.tenant_id,
    'amount_cents', v_d.amount_cents,
    'fee_cover_cents', v_d.fee_cover_cents,
    'donor_name', v_d.donor_name,
    'donor_email', v_d.donor_email,
    'message', v_d.message,
    'is_anonymous', v_d.is_anonymous,
    'fundraiser_slug', v_f.slug,
    'fundraiser_title', v_f.name,
    'tax_deductible', v_f.tax_deductible,
    'ein', v_f.ein,
    'receipt_note', v_f.receipt_note,
    'participant_slug', v_p.slug,
    'participant_name', v_p.display_name,
    'participant_user_id', v_p.user_id
  );
END $$;

-- Roster import: only the default-goal lookup touched a renamed column.
CREATE OR REPLACE FUNCTION public.gw_giving_import_roster(
  p_fundraiser_id UUID, p_user_ids UUID[], p_goal_cents INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_f RECORD; v_prof RECORD; v_slug TEXT; v_base TEXT; v_n INT; v_created INT := 0; v_skipped INT := 0;
BEGIN
  SELECT * INTO v_f FROM gw_fundraisers WHERE id = p_fundraiser_id;
  IF v_f IS NULL THEN RETURN jsonb_build_object('error','fundraiser_not_found'); END IF;

  IF NOT EXISTS (
    SELECT 1 FROM gw_profiles p
     WHERE p.user_id = auth.uid()
       AND p.tenant_id = v_f.tenant_id
       AND (p.is_admin OR p.is_super_admin)
  ) THEN
    RETURN jsonb_build_object('error','forbidden');
  END IF;

  FOR v_prof IN
    SELECT user_id, full_name, first_name, last_name, avatar_url
      FROM gw_profiles
     WHERE tenant_id = v_f.tenant_id
       AND user_id = ANY(p_user_ids)
  LOOP
    IF EXISTS (SELECT 1 FROM gw_fundraiser_participants
                WHERE fundraiser_id = p_fundraiser_id AND user_id = v_prof.user_id) THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    v_base := lower(regexp_replace(
      COALESCE(NULLIF(trim(v_prof.first_name), ''), split_part(COALESCE(v_prof.full_name,'singer'), ' ', 1))
      || '-' || left(COALESCE(NULLIF(trim(v_prof.last_name), ''), split_part(COALESCE(v_prof.full_name,'x'), ' ', 2), 'x'), 1),
      '[^a-z0-9]+', '-', 'g'));
    v_base := trim(both '-' from v_base);
    IF v_base = '' OR v_base IS NULL THEN v_base := 'singer'; END IF;
    v_slug := v_base; v_n := 1;
    WHILE EXISTS (SELECT 1 FROM gw_fundraiser_participants WHERE fundraiser_id = p_fundraiser_id AND slug = v_slug) LOOP
      v_n := v_n + 1; v_slug := v_base || '-' || v_n;
    END LOOP;

    INSERT INTO gw_fundraiser_participants (
      tenant_id, fundraiser_id, user_id, display_name, slug, photo_url, goal_cents, is_public
    ) VALUES (
      v_f.tenant_id, p_fundraiser_id, v_prof.user_id,
      COALESCE(NULLIF(trim(v_prof.first_name), ''), split_part(COALESCE(v_prof.full_name,'Singer'), ' ', 1))
        || COALESCE(' ' || left(NULLIF(trim(v_prof.last_name), ''), 1) || '.', ''),
      v_slug, v_prof.avatar_url,
      COALESCE(p_goal_cents, v_f.default_participant_goal_cents),
      false
    );
    v_created := v_created + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'created', v_created, 'skipped', v_skipped);
END $$;
