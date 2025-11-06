-- Add scroll speed setting to dashboard hero
CREATE TABLE IF NOT EXISTS dashboard_hero_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auto_scroll_enabled BOOLEAN DEFAULT true,
  scroll_speed_seconds INTEGER DEFAULT 5 CHECK (scroll_speed_seconds >= 2 AND scroll_speed_seconds <= 30),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE dashboard_hero_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Public can view hero settings"
  ON dashboard_hero_settings
  FOR SELECT
  USING (true);

-- Create policy for authenticated users to update (admins will verify in app)
CREATE POLICY "Authenticated can update hero settings"
  ON dashboard_hero_settings
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Create policy for authenticated users to insert (admins will verify in app)
CREATE POLICY "Authenticated can insert hero settings"
  ON dashboard_hero_settings
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Insert default settings if none exist
INSERT INTO dashboard_hero_settings (auto_scroll_enabled, scroll_speed_seconds)
SELECT true, 5
WHERE NOT EXISTS (SELECT 1 FROM dashboard_hero_settings LIMIT 1);