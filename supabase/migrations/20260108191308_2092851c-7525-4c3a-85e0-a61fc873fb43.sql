-- Ensure Amazon Affiliate module exists in gw_modules so it appears in the dashboard UI
INSERT INTO public.gw_modules (name, key, description, category, is_active, default_permissions)
SELECT
  'amazon-affiliate'::text,
  'amazon-affiliate'::text,
  'Manage Amazon affiliate products displayed across the site'::text,
  'finances'::text,
  true,
  '{}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.gw_modules WHERE key = 'amazon-affiliate'
);
