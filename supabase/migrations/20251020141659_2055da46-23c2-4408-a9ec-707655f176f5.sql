-- Create dashboard_hero_slides table for the scrolling hero carousel
CREATE TABLE IF NOT EXISTS dashboard_hero_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  description TEXT,
  image_url TEXT NOT NULL,
  mobile_image_url TEXT,
  ipad_image_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE dashboard_hero_slides ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view active slides
CREATE POLICY "Anyone can view active dashboard hero slides"
  ON dashboard_hero_slides
  FOR SELECT
  USING (is_active = true);

-- Only admins can manage slides
CREATE POLICY "Admins can manage dashboard hero slides"
  ON dashboard_hero_slides
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM gw_profiles
      WHERE gw_profiles.user_id = auth.uid()
      AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
    )
  );

-- Create updated_at trigger
CREATE TRIGGER update_dashboard_hero_slides_updated_at
  BEFORE UPDATE ON dashboard_hero_slides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the three initial hero slides
INSERT INTO dashboard_hero_slides (title, description, image_url, display_order, is_active)
VALUES 
  (
    'Glee Club in Concert',
    'October 26 • LYKE House Catholic Center • 5 PM',
    'https://oopmlreysjzuxzylyheb.supabase.co/storage/v1/object/public/user-files/hero-images/glee-concert-oct.jpg',
    1,
    true
  ),
  (
    'A Taste of Christmas Concert',
    'Tuesday, December 2, 2025 • Sisters Chapel, Spelman College',
    'https://oopmlreysjzuxzylyheb.supabase.co/storage/v1/object/public/user-files/hero-images/christmas-taste.jpg',
    2,
    true
  ),
  (
    'Christmas Carol Concert',
    'December 5-7 • Dec 5: Morehouse King Chapel • Dec 6: Spelman Sisters Chapel • Dec 7: Morehouse King Chapel',
    'https://oopmlreysjzuxzylyheb.supabase.co/storage/v1/object/public/user-files/hero-images/christmas-carol.jpg',
    3,
    true
  );