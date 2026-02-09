// Universal Slider Type Definitions

export type SliderType = 'youtube' | 'ad' | 'product' | 'amazon_affiliate' | 'calendar' | 'custom';
export type SlideType = 'image' | 'youtube' | 'video' | 'product' | 'amazon' | 'calendar_event' | 'custom_html';
export type HeightPreset = 'small' | 'medium' | 'large' | 'custom';
export type TransitionEffect = 'fade' | 'slide' | 'none';
export type PositionH = 'left' | 'center' | 'right';
export type PositionV = 'top' | 'center' | 'bottom';
export type GapSize = 'none' | 'sm' | 'md' | 'lg';
export type CtaStyle = 'primary' | 'secondary' | 'outline' | 'ghost';

export interface UniversalSlider {
  id: string;
  name: string;
  placement_key: string;
  slider_type: SliderType;
  column_count: number;
  is_full_width: boolean;
  height_preset: HeightPreset;
  custom_height_px: number | null;
  gap_size: GapSize;
  auto_play: boolean;
  default_slide_duration_seconds: number;
  transition_effect: TransitionEffect;
  show_navigation: boolean;
  show_dots: boolean;
  loop: boolean;
  is_active: boolean;
  display_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UniversalSliderSlide {
  id: string;
  slider_id: string;
  slide_type: SlideType;
  
  // Image
  image_url: string | null;
  mobile_image_url: string | null;
  tablet_image_url: string | null;
  alt_text: string | null;
  
  // YouTube
  youtube_video_id: string | null;
  youtube_autoplay: boolean;
  youtube_muted: boolean;
  youtube_loop: boolean;
  
  // Uploaded Video
  video_url: string | null;
  
  // Product/Amazon
  product_id: string | null;
  amazon_asin: string | null;
  amazon_affiliate_tag: string | null;
  product_url: string | null;
  product_price: string | null;
  
  // Calendar Event
  event_id: string | null;
  
  // Title styling
  title: string | null;
  title_font_family: string;
  title_font_size: string;
  title_font_weight: string;
  title_color: string;
  title_position_h: PositionH;
  title_position_v: PositionV;
  
  // Description styling
  description: string | null;
  description_font_family: string;
  description_font_size: string;
  description_font_weight: string;
  description_color: string;
  description_position_h: PositionH;
  description_position_v: PositionV;
  
  // CTA
  cta_text: string | null;
  cta_url: string | null;
  cta_target: string;
  cta_style: CtaStyle;
  
  // Link
  link_url: string | null;
  link_target: string;
  
  // Timing
  duration_seconds: number | null;
  pause_on_this_slide: boolean;
  
  // Overlay & Effects
  overlay_color: string;
  overlay_enabled: boolean;
  background_position: string;
  background_size: string;
  
  // Status
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface SliderWithSlides extends UniversalSlider {
  slides: UniversalSliderSlide[];
}

// Height presets in pixels
export const HEIGHT_PRESETS: Record<HeightPreset, { mobile: number; tablet: number; desktop: number }> = {
  small: { mobile: 200, tablet: 280, desktop: 350 },
  medium: { mobile: 280, tablet: 400, desktop: 500 },
  large: { mobile: 350, tablet: 500, desktop: 700 },
  custom: { mobile: 280, tablet: 400, desktop: 500 },
};

// Gap size in tailwind classes
export const GAP_CLASSES: Record<GapSize, string> = {
  none: 'gap-0',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
};
