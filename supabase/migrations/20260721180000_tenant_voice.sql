-- Tenant-scoped default assistant voice — set on the Branding tab of
-- Workspace Settings, applies to every user in the tenant. Same shape as
-- primary_color / accent_color / font_family: tenant-branded, one value
-- per tenant, no per-user override.
--
-- Null = "use the app default (Jessica)". Any non-null value is expected
-- to be an ElevenLabs voice_id from src/lib/assistant/voices.ts, or the
-- sentinel 'browser' meaning "skip ElevenLabs, use browser TTS".

ALTER TABLE public.gw_branding_settings
  ADD COLUMN IF NOT EXISTS assistant_voice_id TEXT;

-- Backward-compat: the per-user column from the prior iteration stays in
-- gw_profiles (nullable) so nothing that reads it breaks, but no code
-- writes it now. Drop later if/when a full sweep confirms no readers.
