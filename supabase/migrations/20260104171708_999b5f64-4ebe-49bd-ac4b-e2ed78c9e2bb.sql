-- Create theme_templates table to store predefined themes
-- This becomes the authoritative source for all theme definitions

CREATE TABLE public.theme_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Color palette (HSL format for CSS variables)
  color_primary TEXT NOT NULL DEFAULT '203 85% 63%',
  color_primary_foreground TEXT NOT NULL DEFAULT '0 0% 100%',
  color_secondary TEXT NOT NULL DEFAULT '219 78% 31%',
  color_secondary_foreground TEXT NOT NULL DEFAULT '0 0% 100%',
  color_accent TEXT NOT NULL DEFAULT '203 85% 63%',
  color_accent_foreground TEXT NOT NULL DEFAULT '219 78% 15%',
  color_background TEXT NOT NULL DEFAULT '0 0% 100%',
  color_foreground TEXT NOT NULL DEFAULT '0 0% 10%',
  color_card TEXT NOT NULL DEFAULT '0 0% 100%',
  color_card_foreground TEXT NOT NULL DEFAULT '0 0% 10%',
  color_muted TEXT NOT NULL DEFAULT '40 10% 96%',
  color_muted_foreground TEXT NOT NULL DEFAULT '0 0% 40%',
  color_border TEXT NOT NULL DEFAULT '40 5% 88%',
  color_destructive TEXT NOT NULL DEFAULT '0 84% 60%',
  color_destructive_foreground TEXT NOT NULL DEFAULT '0 0% 100%',
  
  -- Typography settings
  font_family TEXT NOT NULL DEFAULT '''Inter'', ''Roboto'', system-ui, sans-serif',
  font_heading TEXT DEFAULT '''Bebas Neue'', system-ui, sans-serif',
  heading_shadow TEXT,
  
  -- Background settings
  background_type TEXT NOT NULL DEFAULT 'solid' CHECK (background_type IN ('solid', 'gradient', 'image')),
  background_value TEXT NOT NULL DEFAULT 'hsl(0 0% 100%)',
  
  -- Display settings
  is_dark_theme BOOLEAN NOT NULL DEFAULT false,
  glass_effect BOOLEAN NOT NULL DEFAULT false,
  
  -- Metadata
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.theme_templates ENABLE ROW LEVEL SECURITY;

-- Public read access (themes are public)
CREATE POLICY "Themes are viewable by everyone" 
  ON public.theme_templates 
  FOR SELECT 
  USING (is_active = true);

-- Admin write access
CREATE POLICY "Admins can manage themes" 
  ON public.theme_templates 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Insert the 5 predefined themes
INSERT INTO public.theme_templates (id, name, description, sort_order, is_dark_theme, glass_effect,
  color_primary, color_primary_foreground, color_secondary, color_secondary_foreground,
  color_accent, color_accent_foreground, color_background, color_foreground,
  color_card, color_card_foreground, color_muted, color_muted_foreground, color_border,
  font_family, font_heading, heading_shadow, background_type, background_value
) VALUES
-- Glee World (default dark theme)
('glee-world', 'Glee World', 'Bold, musical, and vibrant - the signature Glee World experience', 1, true, false,
  '203 85% 63%', '219 78% 15%', '219 78% 31%', '0 0% 100%',
  '203 85% 63%', '219 78% 15%', '219 78% 15%', '0 0% 100%',
  '219 60% 20%', '0 0% 100%', '219 50% 25%', '0 0% 85%', '219 40% 35%',
  '''Roboto'', sans-serif', '''Montserrat'', sans-serif', NULL, 
  'gradient', 'linear-gradient(135deg, hsl(219 78% 15%) 0%, hsl(219 78% 25%) 50%, hsl(203 60% 20%) 100%)'
),
-- Spelman Blue (light glass theme)
('spelman-blue', 'Spelman Blue', 'Clean, modern, and professional - inspired by Spelman College', 2, false, true,
  '203 85% 63%', '0 0% 100%', '208 100% 50%', '0 0% 100%',
  '197 80% 70%', '208 100% 20%', '208 100% 33%', '0 0% 100%',
  '0 0% 100% / 0.15', '0 0% 100%', '0 0% 100% / 0.1', '0 0% 85%', '0 0% 100% / 0.25',
  '''Inter'', ''Segoe UI'', system-ui, sans-serif', '''Inter'', ''Segoe UI'', system-ui, sans-serif', NULL,
  'gradient', 'linear-gradient(180deg, hsl(208 100% 33%) 0%, hsl(203 100% 40%) 40%, hsl(197 80% 63%) 100%)'
),
-- SpelHouse (collegiate light theme)
('spelhouse', 'SpelHouse', 'United excellence - Spelman Blue meets Morehouse Maroon', 3, false, false,
  '210 65% 45%', '0 0% 100%', '352 65% 28%', '0 0% 100%',
  '210 70% 55%', '0 0% 100%', '210 30% 95%', '352 65% 20%',
  '0 0% 100%', '352 65% 20%', '210 20% 92%', '352 30% 35%', '210 20% 80%',
  '''Libre Baskerville'', ''Georgia'', serif', '''Playfair Display'', ''Georgia'', serif', NULL,
  'gradient', 'linear-gradient(to right, hsl(210 65% 45%) 0%, hsl(210 65% 45%) 50%, hsl(352 65% 28%) 50%, hsl(352 65% 28%) 100%)'
),
-- Music Studio (dark modern theme)
('music', 'Music Studio', 'Sleek and modern with electric energy', 4, true, false,
  '210 100% 50%', '0 0% 100%', '0 0% 10%', '0 0% 100%',
  '180 100% 50%', '0 0% 0%', '0 0% 8%', '0 0% 95%',
  '0 0% 12%', '0 0% 95%', '0 0% 15%', '0 0% 70%', '0 0% 25%',
  '''Inter'', sans-serif', '''Orbitron'', sans-serif', NULL,
  'gradient', 'linear-gradient(135deg, hsl(0 0% 5%) 0%, hsl(210 50% 10%) 50%, hsl(0 0% 8%) 100%)'
),
-- HBCU Pride (dark Pan-African theme)
('hbcu', 'HBCU Pride', 'Bold Pan-African celebration - Red, Gold, Green & Black', 5, true, false,
  '45 65% 55%', '0 0% 0%', '0 72% 42%', '45 65% 75%',
  '135 38% 27%', '45 65% 85%', '0 0% 0%', '45 65% 75%',
  '0 0% 8%', '45 65% 75%', '0 0% 12%', '135 30% 55%', '0 72% 42%',
  '''Graduate'', ''Bebas Neue'', sans-serif', '''Graduate'', ''Oswald'', sans-serif', 
  '2px 2px 0px hsl(0 0% 0%), 3px 3px 0px hsl(0 72% 42%)',
  'gradient', 'linear-gradient(135deg, hsl(0 0% 5%) 0%, hsl(0 0% 8%) 50%, hsl(135 20% 8%) 100%)'
);

-- Create updated_at trigger
CREATE TRIGGER update_theme_templates_updated_at
  BEFORE UPDATE ON public.theme_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.theme_templates IS 'Authoritative source for theme definitions. Colors are in HSL format for CSS variable injection.';