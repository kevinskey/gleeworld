-- Universal Slider System
-- Supports: YouTube, Ad, Product, Amazon Affiliate, Calendar, Custom sliders
-- Features: 1-3 column layouts, full-width toggle, per-slide pause control

CREATE TABLE gw_universal_sliders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identification & Placement
  name text NOT NULL,
  placement_key text NOT NULL, -- e.g., 'homepage_hero', 'fan_dashboard_top', 'product_page_1'
  slider_type text NOT NULL DEFAULT 'custom', -- 'youtube', 'ad', 'product', 'amazon_affiliate', 'calendar', 'custom'
  
  -- Layout Options
  column_count integer DEFAULT 1 CHECK (column_count BETWEEN 1 AND 3),
  is_full_width boolean DEFAULT true,
  height_preset text DEFAULT 'medium', -- 'small', 'medium', 'large', 'custom'
  custom_height_px integer,
  gap_size text DEFAULT 'md', -- 'none', 'sm', 'md', 'lg'
  
  -- Global Carousel Settings
  auto_play boolean DEFAULT true,
  default_slide_duration_seconds integer DEFAULT 5,
  transition_effect text DEFAULT 'fade', -- 'fade', 'slide', 'none'
  show_navigation boolean DEFAULT true,
  show_dots boolean DEFAULT true,
  loop boolean DEFAULT true,
  
  -- Status
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  
  -- Metadata
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Individual slides within a slider
CREATE TABLE gw_universal_slider_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slider_id uuid REFERENCES gw_universal_sliders(id) ON DELETE CASCADE NOT NULL,
  
  -- Content Type (determines which fields are used)
  slide_type text NOT NULL DEFAULT 'image', -- 'image', 'youtube', 'product', 'amazon', 'calendar_event', 'custom_html'
  
  -- Image Content
  image_url text,
  mobile_image_url text,
  tablet_image_url text,
  alt_text text,
  
  -- YouTube Content
  youtube_video_id text,
  youtube_autoplay boolean DEFAULT false,
  youtube_muted boolean DEFAULT true,
  youtube_loop boolean DEFAULT false,
  
  -- Product/Amazon Content (links to existing tables or external)
  product_id uuid, -- Reference to internal product if applicable
  amazon_asin text,
  amazon_affiliate_tag text,
  product_url text,
  product_price text,
  
  -- Calendar Event Content
  event_id uuid, -- Reference to gw_events if applicable
  
  -- Text Overlay
  title text,
  title_font_family text DEFAULT 'inherit',
  title_font_size text DEFAULT 'text-4xl',
  title_font_weight text DEFAULT 'bold',
  title_color text DEFAULT '#FFFFFF',
  title_position_h text DEFAULT 'center', -- 'left', 'center', 'right'
  title_position_v text DEFAULT 'center', -- 'top', 'center', 'bottom'
  
  description text,
  description_font_family text DEFAULT 'inherit',
  description_font_size text DEFAULT 'text-lg',
  description_font_weight text DEFAULT 'normal',
  description_color text DEFAULT '#FFFFFF',
  description_position_h text DEFAULT 'center',
  description_position_v text DEFAULT 'center',
  
  -- Call to Action
  cta_text text,
  cta_url text,
  cta_target text DEFAULT '_self', -- '_self', '_blank'
  cta_style text DEFAULT 'primary', -- 'primary', 'secondary', 'outline', 'ghost'
  
  -- Link (whole slide clickable)
  link_url text,
  link_target text DEFAULT '_self',
  
  -- Individual Slide Timing
  duration_seconds integer, -- Override slider default if set
  pause_on_this_slide boolean DEFAULT false, -- Stops auto-advance on this slide
  
  -- Overlay & Effects
  overlay_color text DEFAULT 'rgba(0,0,0,0.3)',
  overlay_enabled boolean DEFAULT true,
  background_position text DEFAULT 'center',
  background_size text DEFAULT 'cover',
  
  -- Status
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE gw_universal_sliders ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_universal_slider_slides ENABLE ROW LEVEL SECURITY;

-- Public read for active sliders
CREATE POLICY "Anyone can view active sliders" ON gw_universal_sliders
  FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view active slider slides" ON gw_universal_slider_slides
  FOR SELECT USING (is_active = true);

-- Admin full access (using app_roles)
CREATE POLICY "Admins can manage sliders" ON gw_universal_sliders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM app_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'executive')
      AND is_active = true
    )
  );

CREATE POLICY "Admins can manage slider slides" ON gw_universal_slider_slides
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM app_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'executive')
      AND is_active = true
    )
  );

-- Indexes for performance
CREATE INDEX idx_universal_sliders_placement ON gw_universal_sliders(placement_key) WHERE is_active = true;
CREATE INDEX idx_universal_slider_slides_slider ON gw_universal_slider_slides(slider_id, display_order) WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER update_gw_universal_sliders_updated_at
  BEFORE UPDATE ON gw_universal_sliders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gw_universal_slider_slides_updated_at
  BEFORE UPDATE ON gw_universal_slider_slides
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();