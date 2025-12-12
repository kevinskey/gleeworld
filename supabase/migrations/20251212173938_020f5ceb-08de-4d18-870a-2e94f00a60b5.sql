-- Add The Lab module to gw_modules for ElevenLabs tools
INSERT INTO public.gw_modules (name, key, description, category, is_active, default_permissions)
VALUES (
  'The Lab',
  'the-lab',
  'ElevenLabs AI voice & audio tools - TTS, transcription, sound effects, and music generation',
  'system',
  true,
  '{"canAccess": ["admin", "super-admin"], "canManage": ["admin", "super-admin"]}'::jsonb
)
ON CONFLICT (key) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active,
  default_permissions = EXCLUDED.default_permissions;