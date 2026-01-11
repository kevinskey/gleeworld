
-- Migrate existing hero data to universal slider system

-- 1. Create slider for Advertising Hero (Homepage)
INSERT INTO gw_universal_sliders (
  id, name, placement_key, slider_type, column_count, is_full_width,
  height_preset, auto_play, default_slide_duration_seconds, transition_effect,
  show_navigation, show_dots, loop, is_active, display_order
) VALUES (
  gen_random_uuid(), 'Homepage Hero', 'homepage_hero', 'ad', 1, true,
  'large', true, 5, 'fade', true, true, true, true, 1
);

-- 2. Create slider for Dashboard Hero
INSERT INTO gw_universal_sliders (
  id, name, placement_key, slider_type, column_count, is_full_width,
  height_preset, auto_play, default_slide_duration_seconds, transition_effect,
  show_navigation, show_dots, loop, is_active, display_order
) VALUES (
  gen_random_uuid(), 'Dashboard Hero', 'dashboard_hero', 'custom', 1, true,
  'medium', true, 6, 'slide', true, true, true, true, 2
);

-- 3. Create slider for Alumnae Newsletter
INSERT INTO gw_universal_sliders (
  id, name, placement_key, slider_type, column_count, is_full_width,
  height_preset, auto_play, default_slide_duration_seconds, transition_effect,
  show_navigation, show_dots, loop, is_active, display_order
) VALUES (
  gen_random_uuid(), 'Alumnae Newsletter Hero', 'alumnae_newsletter_hero', 'custom', 1, true,
  'medium', true, 5, 'fade', true, true, true, true, 3
);

-- 4. Migrate advertising_hero slides
INSERT INTO gw_universal_slider_slides (
  slider_id, slide_type, image_url, mobile_image_url, tablet_image_url,
  title, description, link_url, link_target, is_active, display_order,
  amazon_affiliate_tag, title_color, description_color
)
SELECT 
  (SELECT id FROM gw_universal_sliders WHERE placement_key = 'homepage_hero'),
  'image',
  ah.image_url,
  ah.mobile_image_url,
  ah.ipad_image_url,
  ah.title,
  ah.description,
  ah.link_url,
  COALESCE(ah.link_target, '_self'),
  ah.is_active,
  COALESCE(ah.display_order, 0),
  ah.amazon_affiliate_tag,
  '#FFFFFF',
  '#FFFFFF'
FROM advertising_hero ah
ORDER BY ah.display_order;

-- 5. Migrate dashboard_hero_slides
INSERT INTO gw_universal_slider_slides (
  slider_id, slide_type, image_url, mobile_image_url, tablet_image_url,
  title, description, link_url, link_target, is_active, display_order,
  title_color, description_color
)
SELECT 
  (SELECT id FROM gw_universal_sliders WHERE placement_key = 'dashboard_hero'),
  'image',
  dhs.image_url,
  dhs.mobile_image_url,
  dhs.ipad_image_url,
  dhs.title,
  dhs.description,
  dhs.link_url,
  COALESCE(dhs.link_target, '_self'),
  dhs.is_active,
  COALESCE(dhs.display_order, 0),
  '#FFFFFF',
  '#FFFFFF'
FROM dashboard_hero_slides dhs
ORDER BY dhs.display_order;

-- 6. Migrate alumnae_newsletter_hero_slides
INSERT INTO gw_universal_slider_slides (
  slider_id, slide_type, image_url, title, description,
  is_active, display_order, title_color, description_color
)
SELECT 
  (SELECT id FROM gw_universal_sliders WHERE placement_key = 'alumnae_newsletter_hero'),
  'image',
  anhs.image_url,
  anhs.title,
  anhs.description,
  true,
  COALESCE(anhs.display_order, 0),
  '#FFFFFF',
  '#FFFFFF'
FROM alumnae_newsletter_hero_slides anhs
ORDER BY anhs.display_order;
