-- Per-tenant dashboard date card choice. One row per tenant already exists in
-- gw_branding_settings; tenant_id is supplied by the set_tenant_id_default()
-- trigger, so clients never send it.
ALTER TABLE public.gw_branding_settings
  ADD COLUMN IF NOT EXISTS date_card jsonb NOT NULL
  DEFAULT '{"v":1,"type":"plain","config":{}}'::jsonb;

COMMENT ON COLUMN public.gw_branding_settings.date_card IS
  'Versioned envelope {v,type,config} selecting the dashboard date card. type maps to DATE_CARD_REGISTRY in src/components/home/date-card/registry.ts.';
