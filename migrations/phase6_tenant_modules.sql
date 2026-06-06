-- Phase 6: Per-tenant add-on subscriptions (billing & feature gating)
-- Names billing tables explicitly: gw_billing_modules + gw_tenant_subscriptions
-- to avoid collision with existing gw_modules (runtime permissions registry).

BEGIN;

-- 1. Billing module catalog — every saleable feature on the platform
CREATE TABLE IF NOT EXISTS public.gw_billing_modules (
  id text PRIMARY KEY,                    -- slug: 'finance', 'tour', 'sms', ...
  name text NOT NULL,
  description text,
  tier text NOT NULL CHECK (tier IN ('starter','addon','enterprise')),
  monthly_price_cents int,                -- NULL for starter
  stripe_price_id text,                   -- Stripe Price ID (set after Stripe products created)
  sort_order int NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  category text,
  icon text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Platform-global table: every tenant reads the same catalog
ALTER TABLE public.gw_billing_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gw_billing_modules_read_all ON public.gw_billing_modules;
CREATE POLICY gw_billing_modules_read_all ON public.gw_billing_modules
  FOR SELECT TO authenticated, anon USING (is_active);

-- 2. Tenant ↔ billing module subscriptions
CREATE TABLE IF NOT EXISTS public.gw_tenant_subscriptions (
  tenant_id uuid NOT NULL REFERENCES public.gw_tenants(id) ON DELETE CASCADE,
  module_id text NOT NULL REFERENCES public.gw_billing_modules(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','trial','past_due','cancelled')),
  enabled_at timestamptz NOT NULL DEFAULT now(),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  stripe_subscription_id text,
  cancelled_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (tenant_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_gw_tenant_subs_status ON gw_tenant_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_gw_tenant_subs_tenant ON gw_tenant_subscriptions(tenant_id);

ALTER TABLE public.gw_tenant_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_subs_select ON public.gw_tenant_subscriptions;
CREATE POLICY tenant_subs_select ON public.gw_tenant_subscriptions
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS tenant_subs_admin_write ON public.gw_tenant_subscriptions;
CREATE POLICY tenant_subs_admin_write ON public.gw_tenant_subscriptions
  FOR ALL TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.gw_tenant_members tm
      WHERE tm.user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
        AND tm.tenant_id = public.current_tenant_id()
        AND tm.role IN ('super_admin','admin')
    )
  )
  WITH CHECK (tenant_id = public.current_tenant_id());

-- 3. Stripe customer per tenant
ALTER TABLE public.gw_tenants ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- 4. Helper function
CREATE OR REPLACE FUNCTION public.tenant_has_billing_module(p_module_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_billing_modules m
    WHERE m.id = p_module_id AND m.is_active
      AND (
        m.tier = 'starter'
        OR EXISTS (
          SELECT 1 FROM public.gw_tenant_subscriptions s
          WHERE s.tenant_id = public.current_tenant_id()
            AND s.module_id = m.id
            AND s.status IN ('active','trial')
            AND (s.current_period_end IS NULL OR s.current_period_end > now())
        )
      )
  );
$$;
GRANT EXECUTE ON FUNCTION public.tenant_has_billing_module(text) TO authenticated, anon;

-- 5. View — current tenant's active modules in one query
CREATE OR REPLACE VIEW public.v_tenant_active_modules AS
SELECT
  m.id AS module_id,
  m.name AS module_name,
  m.description,
  m.tier,
  m.category,
  m.icon,
  m.sort_order,
  COALESCE(s.status, 'starter') AS status,
  s.current_period_end,
  s.trial_ends_at
FROM public.gw_billing_modules m
LEFT JOIN public.gw_tenant_subscriptions s
  ON s.module_id = m.id AND s.tenant_id = public.current_tenant_id()
WHERE m.is_active
  AND (
    m.tier = 'starter'
    OR (s.status IN ('active','trial') AND (s.current_period_end IS NULL OR s.current_period_end > now()))
  )
ORDER BY m.sort_order;

GRANT SELECT ON public.v_tenant_active_modules TO authenticated, anon;

-- 6. Seed catalog
INSERT INTO public.gw_billing_modules (id, name, description, tier, monthly_price_cents, sort_order, category) VALUES
  ('users',           'Users & Roles',         'Roster, permissions, profiles',                    'starter', NULL,   10, 'admin'),
  ('courses',         'Academy & Courses',     'Full LMS — modules, assignments, journal, polls, peer reviews', 'starter', NULL, 20, 'lms'),
  ('calendar',        'Calendar',              'Events + scheduling',                              'starter', NULL,   30, 'lms'),
  ('attendance',      'Attendance',            'QR codes, records, excuses',                       'starter', NULL,   40, 'lms'),
  ('music_library',   'Music Library',         'Scores, recordings, folders',                      'starter', NULL,   50, 'media'),
  ('communications',  'Communications',        'Email, push, in-app messenger',                    'starter', NULL,   60, 'admin'),
  ('announcements',   'Announcements',         'Site-wide announcements',                          'starter', NULL,   70, 'admin'),
  ('messenger',       'Messenger',             'Real-time chat',                                   'starter', NULL,   80, 'admin'),
  ('auditions',       'Auditions',             'Pipeline, evaluations, scheduling',                'starter', NULL,   90, 'lms'),
  ('branding',        'Branding',              'Logo, colors, copy',                               'starter', NULL,  100, 'admin'),
  ('public_site',     'Public Landing',        'Heroes, sliders, press kit, public forms',         'starter', NULL,  110, 'marketing'),
  ('finance',                  'Finance',                  'Budgets, receipts, invoices, payments, W9, reimbursements', 'addon', 1500, 200, 'finance'),
  ('tour',                     'Tour Management',          'Cities, bus, hotels, logistics, timeline, crew',           'addon', 2500, 210, 'tour'),
  ('sms',                      'SMS',                      'Twilio passthrough, broadcast SMS, conversations',         'addon', 1000, 220, 'admin'),
  ('video',                    'Video & Live',             'Video sessions, Jitsi embed, video edits',                 'addon', 1500, 230, 'media'),
  ('sheet_music_annotation',   'Sheet Music Annotation',   'Annotations, marked scores, sharing, collaborators',        'addon', 1000, 240, 'media'),
  ('contracts',                'Contracts',                'Templates, signatures, contracts v2',                       'addon', 1500, 250, 'admin'),
  ('ai_grading',               'AI Grading',               'AI-powered grading, detection, discussion analytics',       'addon', 2000, 260, 'lms'),
  ('analytics',                'Analytics',                'Engagement, usage, music analytics',                        'addon', 1000, 270, 'admin'),
  ('wardrobe',                 'Wardrobe',                 'Inventory, checkouts, measurements, orders',                'addon', 1000, 280, 'admin'),
  ('radio',                    'Radio / Streaming',        'Stations, episodes, playlists, shoutcast',                  'addon', 1500, 290, 'media'),
  ('quick_capture',            'Quick Capture / Glee Cam', 'Photo/video uploads, social media posts',                   'addon', 1000, 300, 'media'),
  ('sight_reading',            'Sight Reading',            'Sight singing exercises, VirtualPiano, recordings',         'addon', 1500, 310, 'lms')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  sort_order = EXCLUDED.sort_order,
  category = EXCLUDED.category,
  updated_at = now();

COMMIT;

\echo ''
\echo '=== Billing module catalog ==='
SELECT id, tier, COALESCE(monthly_price_cents/100.0, 0) AS monthly_dollars, category
FROM gw_billing_modules ORDER BY sort_order;
