-- Portrait variant of the tenant sign-in background. Portrait viewports
-- (phones, iPad portrait) use this when set; otherwise the landscape
-- auth_background_url is center-cropped as before.
ALTER TABLE public.gw_branding_settings
  ADD COLUMN IF NOT EXISTS auth_background_mobile_url text;
