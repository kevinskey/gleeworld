-- Add slide timing configuration to hero slides
ALTER TABLE gw_hero_slides 
ADD COLUMN slide_duration_seconds integer DEFAULT 5;

-- Create hero settings table for global configuration
CREATE TABLE gw_hero_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auto_play boolean DEFAULT true,
  slide_duration_seconds integer DEFAULT 5,
  transition_effect text DEFAULT 'fade',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE gw_hero_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for hero settings
CREATE POLICY "Public can view hero settings" 
ON gw_hero_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage hero settings" 
ON gw_hero_settings 
FOR ALL 
USING (
  is_admin(auth.uid()) OR is_super_admin(auth.uid())
);

-- Insert default settings
INSERT INTO gw_hero_settings (auto_play, slide_duration_seconds, transition_effect) 
VALUES (true, 5, 'fade');