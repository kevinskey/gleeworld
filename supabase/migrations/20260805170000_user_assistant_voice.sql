-- Per-user assistant voice.
--
-- The voice was tenant-only (gw_branding_settings.assistant_voice_id), so
-- everyone in a workspace heard whatever an admin picked. This adds a personal
-- override while KEEPING the tenant value as the default, so nothing already
-- configured is orphaned:
--
--     user_preferences.assistant_voice_id   (this — the person's choice)
--       └─ falls back to gw_branding_settings.assistant_voice_id  (the tenant's)
--            └─ falls back to the app default voice
--
-- NULL means "no personal choice — use the workspace voice", which is what
-- every existing row means without any backfill.

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS assistant_voice_id text;

COMMENT ON COLUMN public.user_preferences.assistant_voice_id IS
  'ElevenLabs voice_id chosen by this user, or the sentinel ''browser'' for '
  'browser TTS. NULL = inherit the tenant''s branding voice.';

NOTIFY pgrst, 'reload schema';
