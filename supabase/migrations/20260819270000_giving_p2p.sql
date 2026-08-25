-- Peer-to-peer Giving ("GleeRaise") — 99Pledges-style participant fundraising.
--
-- Money model (decided 2026-08-19):
--   • 0% platform fee. Charges are Stripe Connect DIRECT charges on the
--     tenant's own connected account; GleeWorld never holds or routes funds
--     and never sets application_fee_amount. Same posture as Box Office.
--   • GleeWorld is NOT a 501(c)(3) and is not a fiscal sponsor. Deductibility
--     depends entirely on the TENANT's own status, so every fundraiser
--     defaults to tax_deductible = false and receipts print a
--     not-deductible disclosure unless the tenant explicitly attests
--     otherwise and supplies their own EIN.
--
-- Isolation: every table below is tenant_id NOT NULL with the full trio of
-- policies (authenticated restrictive / anon restrictive / service_role) in
-- THIS migration — not deferred to a later sweep. Public read paths do NOT
-- go through anon table policies at all; they go through SECURITY DEFINER
-- RPCs that hand back a hand-picked column list, because a giving page is
-- shared to strangers who arrive with no x-tenant-slug context.

-- ── Tables ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.gw_fundraisers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id) ON DELETE CASCADE,
  -- Globally unique: /give/<slug> is shared into text messages with no
  -- subdomain or tenant header to resolve against, so the slug alone must
  -- identify the campaign (this is what 99Pledges' /fund/<slug> does).
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,60}$'),
  title TEXT NOT NULL,
  story TEXT,
  hero_image_url TEXT,
  goal_cents INTEGER NOT NULL DEFAULT 0 CHECK (goal_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  starts_at TIMESTAMPTZ NULL,
  ends_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','live','closed')),

  allow_participants BOOLEAN NOT NULL DEFAULT true,
  default_participant_goal_cents INTEGER NOT NULL DEFAULT 20000 CHECK (default_participant_goal_cents >= 0),

  -- Donor-side fee cover. NOT a tip: an honest, opt-out "cover the card
  -- processing fee" line, capped well below the 10% tip other platforms
  -- default their donors into.
  fee_cover_enabled BOOLEAN NOT NULL DEFAULT true,
  fee_cover_bps INTEGER NOT NULL DEFAULT 320 CHECK (fee_cover_bps BETWEEN 0 AND 1000),

  min_gift_cents INTEGER NOT NULL DEFAULT 500 CHECK (min_gift_cents >= 100),
  max_gift_cents INTEGER NOT NULL DEFAULT 1000000 CHECK (max_gift_cents > 0),
  suggested_amounts_cents INTEGER[] NOT NULL DEFAULT ARRAY[2500,5000,10000,25000],

  -- Receipt/legal. tax_deductible stays false until a tenant asserts their
  -- own 501(c)(3) status and provides their own EIN. GleeWorld's status is
  -- irrelevant here and is never asserted on a receipt.
  tax_deductible BOOLEAN NOT NULL DEFAULT false,
  ein TEXT NULL,
  receipt_note TEXT NULL,

  -- Minors are pictured on these pages. Default to shareable-but-unlisted;
  -- search indexing is an explicit, deliberate opt-in.
  is_indexable BOOLEAN NOT NULL DEFAULT false,

  raised_cents INTEGER NOT NULL DEFAULT 0,
  donor_count INTEGER NOT NULL DEFAULT 0,

  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gw_fundraiser_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id) ON DELETE CASCADE,
  fundraiser_id UUID NOT NULL REFERENCES public.gw_fundraisers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  goal_cents INTEGER NOT NULL DEFAULT 0 CHECK (goal_cents >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  raised_cents INTEGER NOT NULL DEFAULT 0,
  donor_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gw_fundraiser_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id) ON DELETE CASCADE,
  fundraiser_id UUID NOT NULL REFERENCES public.gw_fundraisers(id) ON DELETE CASCADE,
  group_id UUID NULL REFERENCES public.gw_fundraiser_groups(id) ON DELETE SET NULL,
  -- NULL for roster-only participants: a 6th grader has no GleeWorld login.
  user_id UUID NULL,
  -- Admin-controlled public label. The roster importer writes "First L." —
  -- never a minor's full legal name by default.
  display_name TEXT NOT NULL,
  slug TEXT NOT NULL CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,60}$'),
  grade_label TEXT NULL,
  photo_url TEXT NULL,
  story TEXT NULL,
  video_url TEXT NULL,
  goal_cents INTEGER NOT NULL DEFAULT 20000 CHECK (goal_cents >= 0),

  -- Parental consent gate. A participant page is invisible to the public
  -- until an adult has affirmatively consented; importing a roster does NOT
  -- imply consent.
  consent_granted_at TIMESTAMPTZ NULL,
  consent_granted_by TEXT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,

  -- Lets a parent edit the photo/story/goal without a GleeWorld account.
  manage_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24),'hex'),

  raised_cents INTEGER NOT NULL DEFAULT 0,
  donor_count INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fundraiser_id, slug)
);

CREATE TABLE IF NOT EXISTS public.gw_donations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id) ON DELETE CASCADE,
  fundraiser_id UUID NOT NULL REFERENCES public.gw_fundraisers(id) ON DELETE CASCADE,
  participant_id UUID NULL REFERENCES public.gw_fundraiser_participants(id) ON DELETE SET NULL,
  -- Snapshotted at insert so a participant later moving sections cannot
  -- retroactively rewrite a closed group's total.
  group_id UUID NULL REFERENCES public.gw_fundraiser_groups(id) ON DELETE SET NULL,

  provider TEXT NOT NULL DEFAULT 'stripe',
  provider_session_id TEXT UNIQUE,
  provider_payment_intent_id TEXT UNIQUE,

  -- amount_cents is the GIFT. fee_cover_cents is the optional processing
  -- top-up. Only amount_cents ever counts toward a goal or a leaderboard.
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  fee_cover_cents INTEGER NOT NULL DEFAULT 0 CHECK (fee_cover_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',

  donor_name TEXT NULL,
  donor_email TEXT NULL,
  donor_user_id UUID NULL,
  message TEXT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  hide_amount BOOLEAN NOT NULL DEFAULT false,

  donor_state TEXT NULL,
  donor_country TEXT NULL,

  -- 'offline' covers cash/check gifts a director logs by hand so the
  -- leaderboard stays truthful.
  source TEXT NOT NULL DEFAULT 'online' CHECK (source IN ('online','offline')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','refunded','failed')),

  receipt_sent_at TIMESTAMPTZ NULL,
  thanked_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gw_fundraisers_tenant_status   ON public.gw_fundraisers(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_gw_fr_participants_fundraiser  ON public.gw_fundraiser_participants(fundraiser_id, raised_cents DESC);
CREATE INDEX IF NOT EXISTS idx_gw_fr_participants_tenant      ON public.gw_fundraiser_participants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gw_fr_groups_fundraiser        ON public.gw_fundraiser_groups(fundraiser_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_gw_donations_fundraiser_paid   ON public.gw_donations(fundraiser_id, status, amount_cents DESC);
CREATE INDEX IF NOT EXISTS idx_gw_donations_participant       ON public.gw_donations(participant_id, status, amount_cents DESC);
CREATE INDEX IF NOT EXISTS idx_gw_donations_tenant_created    ON public.gw_donations(tenant_id, created_at DESC);

-- ── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.gw_fundraisers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_fundraiser_groups        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_fundraiser_participants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_donations                ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['gw_fundraisers','gw_fundraiser_groups','gw_fundraiser_participants','gw_donations'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_restrict ON public.%I', t);
    EXECUTE format('CREATE POLICY tenant_isolation_restrict ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id())', t);
    EXECUTE format('DROP POLICY IF EXISTS anon_tenant_isolation ON public.%I', t);
    EXECUTE format('CREATE POLICY anon_tenant_isolation ON public.%I AS RESTRICTIVE FOR ALL TO anon USING (tenant_id = public.anon_tenant_id()) WITH CHECK (tenant_id = public.anon_tenant_id())', t);
    EXECUTE format('DROP POLICY IF EXISTS service_role_only ON public.%I', t);
    EXECUTE format('CREATE POLICY service_role_only ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- Admin write access for signed-in staff of the owning tenant. The
-- RESTRICTIVE tenant policy above still applies on top of this, so this
-- only ever widens access *within* the caller's own tenant.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['gw_fundraisers','gw_fundraiser_groups','gw_fundraiser_participants','gw_donations'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS giving_admin_all ON public.%I', t);
    EXECUTE format($p$CREATE POLICY giving_admin_all ON public.%I FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin OR p.is_super_admin)))
      WITH CHECK (EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin OR p.is_super_admin)))$p$, t);
  END LOOP;
END $$;

-- A participant with a GleeWorld account may read/update their own row
-- (photo, story, goal) but never their goal-independent money columns —
-- those are trigger-maintained and this policy grants no path to the
-- fundraiser or donation tables.
DROP POLICY IF EXISTS giving_participant_self ON public.gw_fundraiser_participants;
CREATE POLICY giving_participant_self ON public.gw_fundraiser_participants
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ── Totals ─────────────────────────────────────────────────────────────────
-- Denormalized counters maintained by trigger. A participant page that goes
-- even mildly viral would otherwise re-aggregate gw_donations on every view.
-- Only status='paid' counts, and only amount_cents (never fee_cover_cents).

CREATE OR REPLACE FUNCTION public.gw_giving_apply_totals()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  d_cents INTEGER := 0;
  d_count INTEGER := 0;
  v_row RECORD;
BEGIN
  -- OLD is unassigned on INSERT and NEW is unassigned on DELETE, and
  -- PL/pgSQL does NOT guarantee short-circuit evaluation of `AND`, so these
  -- have to be guarded by TG_OP in separate statements rather than folded
  -- into one boolean expression.
  IF TG_OP <> 'INSERT' THEN
    IF OLD.status = 'paid' THEN
      d_cents := d_cents - OLD.amount_cents;
      d_count := d_count - 1;
    END IF;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    IF NEW.status = 'paid' THEN
      d_cents := d_cents + NEW.amount_cents;
      d_count := d_count + 1;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN v_row := OLD; ELSE v_row := NEW; END IF;
  IF d_cents = 0 AND d_count = 0 THEN
    RETURN v_row;
  END IF;

  UPDATE gw_fundraisers
     SET raised_cents = GREATEST(0, raised_cents + d_cents),
         donor_count  = GREATEST(0, donor_count + d_count),
         updated_at   = now()
   WHERE id = v_row.fundraiser_id;

  IF v_row.participant_id IS NOT NULL THEN
    UPDATE gw_fundraiser_participants
       SET raised_cents = GREATEST(0, raised_cents + d_cents),
           donor_count  = GREATEST(0, donor_count + d_count),
           updated_at   = now()
     WHERE id = v_row.participant_id;
  END IF;

  IF v_row.group_id IS NOT NULL THEN
    UPDATE gw_fundraiser_groups
       SET raised_cents = GREATEST(0, raised_cents + d_cents),
           donor_count  = GREATEST(0, donor_count + d_count)
     WHERE id = v_row.group_id;
  END IF;

  RETURN v_row;
END $$;

DROP TRIGGER IF EXISTS trg_gw_giving_totals ON public.gw_donations;
CREATE TRIGGER trg_gw_giving_totals
AFTER INSERT OR UPDATE OF status, amount_cents OR DELETE ON public.gw_donations
FOR EACH ROW EXECUTE FUNCTION public.gw_giving_apply_totals();

-- ── Public read surface (SECURITY DEFINER, anon-callable) ──────────────────
-- These deliberately bypass RLS and return a hand-picked column list.
-- donor_email, manage_token, and every non-consented participant stay out.

CREATE OR REPLACE FUNCTION public.gw_giving_fundraiser(p_slug TEXT)
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
  SELECT f.id, f.slug, f.title, f.story, f.hero_image_url,
         f.goal_cents, f.raised_cents, f.donor_count,
         f.currency, f.starts_at, f.ends_at, f.status,
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
     AND f.status IN ('live','closed');
$$;

CREATE OR REPLACE FUNCTION public.gw_giving_participants(
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
     AND f.status IN ('live','closed')
     AND p.is_public
     AND p.consent_granted_at IS NOT NULL
     AND (p_search IS NULL OR p_search = '' OR p.display_name ILIKE '%' || p_search || '%')
   ORDER BY p.raised_cents DESC, p.display_name
   LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200) OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

CREATE OR REPLACE FUNCTION public.gw_giving_participant(p_slug TEXT, p_participant_slug TEXT)
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
     AND f.status IN ('live','closed')
     AND p.is_public
     AND p.consent_granted_at IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.gw_giving_groups(p_slug TEXT)
RETURNS TABLE(id UUID, name TEXT, goal_cents INTEGER, raised_cents INTEGER, donor_count INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT g.id, g.name, g.goal_cents, g.raised_cents, g.donor_count
    FROM gw_fundraiser_groups g
    JOIN gw_fundraisers f ON f.id = g.fundraiser_id
   WHERE f.slug = p_slug AND f.status IN ('live','closed')
   ORDER BY g.sort_order, g.name;
$$;

-- Leaderboard. Anonymous gifts surface as 'Anonymous'; hidden amounts come
-- back NULL rather than being filtered out, so the wall still shows the
-- message and the social proof.
CREATE OR REPLACE FUNCTION public.gw_giving_top_donations(
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
     AND f.status IN ('live','closed')
     AND d.status = 'paid'
     AND (p_participant_slug IS NULL OR p.slug = p_participant_slug)
   ORDER BY d.amount_cents DESC, d.created_at DESC
   LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 100);
$$;

CREATE OR REPLACE FUNCTION public.gw_giving_state_totals(p_slug TEXT)
RETURNS TABLE(donor_state TEXT, raised_cents BIGINT, donor_count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT d.donor_state, sum(d.amount_cents)::bigint, count(*)::bigint
    FROM gw_donations d
    JOIN gw_fundraisers f ON f.id = d.fundraiser_id
   WHERE f.slug = p_slug AND f.status IN ('live','closed')
     AND d.status = 'paid' AND d.donor_state IS NOT NULL
   GROUP BY d.donor_state;
$$;

-- Parent/participant self-service by opaque token — no GleeWorld account.
CREATE OR REPLACE FUNCTION public.gw_giving_participant_by_token(p_token TEXT)
RETURNS TABLE(
  fundraiser_slug TEXT, fundraiser_title TEXT, slug TEXT, display_name TEXT,
  grade_label TEXT, photo_url TEXT, story TEXT, video_url TEXT,
  goal_cents INTEGER, raised_cents INTEGER, is_public BOOLEAN, consent_granted_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT f.slug, f.title, p.slug, p.display_name, p.grade_label, p.photo_url,
         p.story, p.video_url, p.goal_cents, p.raised_cents, p.is_public, p.consent_granted_at
    FROM gw_fundraiser_participants p
    JOIN gw_fundraisers f ON f.id = p.fundraiser_id
   WHERE p.manage_token = p_token AND length(p_token) >= 32;
$$;

CREATE OR REPLACE FUNCTION public.gw_giving_update_participant_by_token(
  p_token TEXT, p_story TEXT, p_goal_cents INTEGER, p_photo_url TEXT,
  p_consent BOOLEAN DEFAULT NULL, p_consent_by TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_p RECORD;
BEGIN
  IF p_token IS NULL OR length(p_token) < 32 THEN RETURN jsonb_build_object('error','bad_token'); END IF;
  SELECT * INTO v_p FROM gw_fundraiser_participants WHERE manage_token = p_token FOR UPDATE;
  IF v_p IS NULL THEN RETURN jsonb_build_object('error','not_found'); END IF;

  UPDATE gw_fundraiser_participants
     SET story       = COALESCE(NULLIF(p_story, ''), story),
         goal_cents  = COALESCE(GREATEST(p_goal_cents, 0), goal_cents),
         photo_url   = COALESCE(NULLIF(p_photo_url, ''), photo_url),
         -- Consent is one-way from this surface: a guardian can grant it,
         -- but revocation goes through an admin so it is logged and
         -- deliberate rather than a stray click on a shared link.
         consent_granted_at = CASE WHEN p_consent IS TRUE AND consent_granted_at IS NULL THEN now() ELSE consent_granted_at END,
         consent_granted_by = CASE WHEN p_consent IS TRUE AND consent_granted_at IS NULL THEN p_consent_by ELSE consent_granted_by END,
         is_public   = CASE WHEN p_consent IS TRUE THEN true ELSE is_public END,
         updated_at  = now()
   WHERE id = v_p.id;

  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION public.gw_giving_fundraiser(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gw_giving_participants(TEXT, TEXT, INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gw_giving_participant(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gw_giving_groups(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gw_giving_top_donations(TEXT, TEXT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gw_giving_state_totals(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gw_giving_participant_by_token(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gw_giving_update_participant_by_token(TEXT, TEXT, INTEGER, TEXT, BOOLEAN, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.gw_giving_fundraiser(TEXT)                            TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gw_giving_participants(TEXT, TEXT, INT, INT)          TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gw_giving_participant(TEXT, TEXT)                     TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gw_giving_groups(TEXT)                                TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gw_giving_top_donations(TEXT, TEXT, INT)              TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gw_giving_state_totals(TEXT)                          TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gw_giving_participant_by_token(TEXT)                  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gw_giving_update_participant_by_token(TEXT, TEXT, INTEGER, TEXT, BOOLEAN, TEXT) TO anon, authenticated, service_role;

-- ── Fulfillment ────────────────────────────────────────────────────────────
-- Called by the Connect webhook handler once Stripe confirms payment.
-- Idempotent on the donation's own status, so a Stripe re-delivery cannot
-- double-count a gift on the leaderboard.

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

  -- Everything the webhook needs to send the donor receipt and the
  -- participant "you got a gift" nudge without a second round trip.
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
    'fundraiser_title', v_f.title,
    'tax_deductible', v_f.tax_deductible,
    'ein', v_f.ein,
    'receipt_note', v_f.receipt_note,
    'participant_slug', v_p.slug,
    'participant_name', v_p.display_name,
    'participant_user_id', v_p.user_id
  );
END $$;

CREATE OR REPLACE FUNCTION public.gw_giving_refund_donation(p_payment_intent_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_d RECORD;
BEGIN
  SELECT * INTO v_d FROM gw_donations WHERE provider_payment_intent_id = p_payment_intent_id FOR UPDATE;
  IF v_d IS NULL THEN RETURN jsonb_build_object('error','donation_not_found'); END IF;
  IF v_d.status = 'refunded' THEN RETURN jsonb_build_object('already_refunded', true); END IF;
  -- The totals trigger decrements every counter off this status change.
  UPDATE gw_donations SET status = 'refunded', updated_at = now() WHERE id = v_d.id;
  RETURN jsonb_build_object('ok', true, 'donation_id', v_d.id);
END $$;

-- ── Roster import ──────────────────────────────────────────────────────────
-- The reason a GleeWorld tenant would leave 99Pledges: 200 participant pages
-- from the roster you already maintain, with photos, instead of a CSV and an
-- evening of typing. Names are published as "First L." and every page stays
-- non-public until a guardian consents.

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

  -- Caller must be an admin of the fundraiser's own tenant. SECURITY DEFINER
  -- bypasses RLS, so this check is the only thing standing between a signed-in
  -- user and another tenant's roster — it is not optional.
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
      -- First name + last initial. Never a minor's full legal name.
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

REVOKE ALL ON FUNCTION public.gw_giving_import_roster(UUID, UUID[], INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gw_giving_import_roster(UUID, UUID[], INTEGER) TO authenticated, service_role;

-- ── Add-on registration ────────────────────────────────────────────────────
-- 'giving' is a tenant add-on alongside 'store' and 'box_office' — same
-- 'revenue' bucket, since all three are tenant-run commerce settling on the
-- tenant's own Connect account. donate-checkout gates on an active/trial
-- gw_tenant_subscriptions row for module_id='giving'.
INSERT INTO public.gw_billing_modules
  (id, name, description, tier, category, icon, is_active, sort_order)
VALUES (
  'giving',
  'Giving',
  'Peer-to-peer fundraising pages for your singers. 0% platform fee — every donation settles directly in your own Stripe account.',
  'addon',
  'revenue',
  'HandHeart',
  true,
  220
)
ON CONFLICT (id) DO NOTHING;
