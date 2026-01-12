-- Add featured products display settings to gw_store_settings
ALTER TABLE public.gw_store_settings
ADD COLUMN IF NOT EXISTS featured_categories text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS featured_display_limit integer DEFAULT 8,
ADD COLUMN IF NOT EXISTS featured_title text DEFAULT 'Featured Products',
ADD COLUMN IF NOT EXISTS featured_subtitle text DEFAULT 'Discover our exclusive collection',
ADD COLUMN IF NOT EXISTS featured_desktop_columns integer DEFAULT 4,
ADD COLUMN IF NOT EXISTS featured_tablet_columns integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS featured_mobile_columns integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS featured_display_style text DEFAULT 'carousel',
ADD COLUMN IF NOT EXISTS featured_show_price boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS featured_show_category boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS featured_show_quick_view boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS featured_card_aspect_ratio text DEFAULT 'square';