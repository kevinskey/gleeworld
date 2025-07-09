-- Enable RLS on hero management tables
ALTER TABLE gw_hero_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_hero_slides ENABLE ROW LEVEL SECURITY;

-- Create policies for gw_hero_settings
CREATE POLICY "Public can view active hero settings" 
ON gw_hero_settings 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage all hero settings" 
ON gw_hero_settings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super-admin')
  )
);

-- Create policies for gw_hero_slides
CREATE POLICY "Public can view active hero slides" 
ON gw_hero_slides 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage all hero slides" 
ON gw_hero_slides 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super-admin')
  )
);