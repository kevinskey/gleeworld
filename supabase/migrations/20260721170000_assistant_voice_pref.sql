-- Per-user assistant voice preference — syncs across devices.
-- Empty/null means "use the browser's built-in speech synth" (free, no
-- ElevenLabs quota). Any non-empty value is expected to be an ElevenLabs
-- voice_id from the curated list in src/lib/assistant/voices.ts.
--
-- Stored on gw_profiles (one row per user, already RLS-scoped so users
-- can only edit their own).

ALTER TABLE public.gw_profiles
  ADD COLUMN IF NOT EXISTS preferred_assistant_voice_id TEXT;
