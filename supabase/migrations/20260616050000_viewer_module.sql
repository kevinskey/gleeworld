-- Register the "Viewer" module — a forScore-style performance/practice
-- reader. Distinct from the Music Library (which is browse + manage):
-- Viewer is the full-bleed, tap-to-reveal-chrome score reader that opens
-- into bookmarks, stamps, audio companion, piano, and setlists.
--
-- Goes into gw_billing_modules — that's the table the v_tenant_active_modules
-- view (used by useModuleAccess) consults. tier='starter' so every tenant
-- gets it included rather than gated behind Stripe; promote to 'addon'
-- later if you want to charge.

INSERT INTO public.gw_billing_modules (id, name, description, tier, category, icon, sort_order, is_active)
VALUES (
  'viewer',
  'Viewer',
  'forScore-style performance reader: full-bleed score, tap-to-reveal chrome, bookmarks, stamps, audio companion, piano, setlists.',
  'starter',
  'library',
  'book-open',
  50,
  true
)
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      tier = EXCLUDED.tier,
      category = EXCLUDED.category,
      icon = EXCLUDED.icon,
      sort_order = EXCLUDED.sort_order,
      is_active = EXCLUDED.is_active;
