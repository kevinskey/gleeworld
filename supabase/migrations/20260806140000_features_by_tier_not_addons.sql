-- Features come with the plan tier now, not as per-module add-ons.
--
-- gw_billing_modules still flags 19 modules as tier='addon', and this view
-- only admitted an addon when gw_tenant_subscriptions held an active or
-- trialing row for it. That table is empty — the add-on business model is
-- gone; every tenant is now on a plan tier (director_60 and up).
--
-- The result was that all 19 addon features were locked AND hidden for every
-- tenant on the platform: Songwriting, Liturgy Planner, Studio, Box Office,
-- Concert Planner, PR Hub and the rest all rendered "This feature is an
-- add-on. Activate this module." for people whose plan already includes them.
--
-- So membership no longer depends on a per-module subscription. What it does
-- NOT yet do is vary by tier: gw_billing_modules has no minimum-tier column,
-- and the tiers describe their contents in marketing prose ("Box Office
-- ticketing", "Liturgy Planner") rather than module ids, with several modules
-- — songwriting, librarian, store, analytics — named in no tier at all.
-- Deriving that mapping would mean inventing pricing, so it is left for a
-- deliberate decision rather than guessed at here.
--
-- A subscription row, where one still exists, keeps its status for display
-- (trial countdowns, period ends). Everything else reports 'included'.

CREATE OR REPLACE VIEW public.v_tenant_active_modules AS
  SELECT m.id AS module_id,
         m.name AS module_name,
         m.description,
         m.tier,
         m.category,
         m.icon,
         m.sort_order,
         COALESCE(s.status, CASE WHEN m.tier = 'starter' THEN 'starter' ELSE 'included' END) AS status,
         s.current_period_end,
         s.trial_ends_at
    FROM public.gw_billing_modules m
    LEFT JOIN public.gw_tenant_subscriptions s
      ON s.module_id = m.id AND s.tenant_id = public.current_tenant_id()
   WHERE m.is_active
   ORDER BY m.sort_order;

NOTIFY pgrst, 'reload schema';
