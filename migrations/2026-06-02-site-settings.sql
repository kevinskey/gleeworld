-- Branding settings: singleton row holding per-tenant identity (logo, org
-- name, theme color). Named gw_branding_settings to avoid collision with
-- the existing key/value gw_site_settings table.

CREATE TABLE IF NOT EXISTS public.gw_branding_settings (
  id           INTEGER PRIMARY KEY DEFAULT 1,
  org_name     TEXT,
  short_name   TEXT,
  tagline      TEXT,
  logo_url     TEXT,
  primary_color TEXT DEFAULT '#003666',
  setup_completed BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT gw_branding_settings_singleton CHECK (id = 1)
);

INSERT INTO public.gw_branding_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.gw_branding_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "branding read" ON public.gw_branding_settings;
CREATE POLICY "branding read" ON public.gw_branding_settings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "branding write" ON public.gw_branding_settings;
CREATE POLICY "branding write" ON public.gw_branding_settings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles p
      WHERE p.id = auth.uid()
      AND (p.is_super_admin = true OR p.is_admin = true OR p.role IN ('super-admin','admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gw_profiles p
      WHERE p.id = auth.uid()
      AND (p.is_super_admin = true OR p.is_admin = true OR p.role IN ('super-admin','admin'))
    )
  );

CREATE OR REPLACE FUNCTION public.touch_gw_branding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS gw_branding_touch ON public.gw_branding_settings;
CREATE TRIGGER gw_branding_touch
  BEFORE UPDATE ON public.gw_branding_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_gw_branding_updated_at();
