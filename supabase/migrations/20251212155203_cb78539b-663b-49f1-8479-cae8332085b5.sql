-- Create notification_sounds table to store generated sounds
CREATE TABLE notification_sounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sound_type TEXT NOT NULL UNIQUE,
  storage_path TEXT NOT NULL,
  prompt_used TEXT,
  duration_seconds NUMERIC(4,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE notification_sounds ENABLE ROW LEVEL SECURITY;

-- Everyone can read sounds (they're preloaded)
CREATE POLICY "Anyone can read notification sounds"
ON notification_sounds FOR SELECT
USING (true);

-- Only admins can manage sounds
CREATE POLICY "Admins can manage notification sounds"
ON notification_sounds FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Add sound preferences to notification preferences if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gw_notification_preferences') THEN
    ALTER TABLE gw_notification_preferences 
    ADD COLUMN IF NOT EXISTS sound_enabled BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS sound_volume NUMERIC(3,2) DEFAULT 0.7;
  END IF;
END $$;

-- Create storage bucket for notification sounds
INSERT INTO storage.buckets (id, name, public)
VALUES ('notification-sounds', 'notification-sounds', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for notification sounds bucket
CREATE POLICY "Anyone can read notification sounds"
ON storage.objects FOR SELECT
USING (bucket_id = 'notification-sounds');

CREATE POLICY "Admins can upload notification sounds"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'notification-sounds' AND
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Admins can delete notification sounds"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'notification-sounds' AND
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true)
  )
);