-- Add usage_context field to gw_hero_slides table to support press kit management
ALTER TABLE gw_hero_slides 
ADD COLUMN usage_context text DEFAULT 'homepage';

-- Add constraint to ensure valid usage contexts
ALTER TABLE gw_hero_slides 
ADD CONSTRAINT check_usage_context 
CHECK (usage_context IN ('homepage', 'press_kit'));

-- Create index for better performance when filtering by usage context
CREATE INDEX idx_hero_slides_usage_context ON gw_hero_slides(usage_context);

-- Insert some sample press kit slides using existing images
INSERT INTO gw_hero_slides (
  title, 
  description, 
  image_url, 
  usage_context, 
  is_active, 
  display_order,
  slide_duration_seconds
) VALUES 
(
  'Performance Excellence', 
  'The Spelman College Glee Club performing at prestigious venues worldwide', 
  '/lovable-uploads/6a86e8cc-1420-4397-8742-983afe6a293f.png', 
  'press_kit', 
  true, 
  1,
  5
),
(
  'Musical Heritage', 
  'Preserving and celebrating the rich musical traditions of African Americans', 
  '/lovable-uploads/d2719d93-5439-4d49-9d9a-0f68a440e7c5.png', 
  'press_kit', 
  true, 
  2,
  5
),
(
  'Leadership Excellence', 
  'Developing the next generation of musical and academic leaders', 
  '/lovable-uploads/82759e4e-12b8-47a8-907b-7b6b22294919.png', 
  'press_kit', 
  true, 
  3,
  5
);