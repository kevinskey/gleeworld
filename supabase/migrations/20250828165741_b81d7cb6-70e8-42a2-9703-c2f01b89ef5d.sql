-- Add a new hero slide for Music Theory Fundamentals class
INSERT INTO gw_hero_slides (
  context,
  image_url,
  mobile_image_url,
  title,
  description,
  button_text,
  button_url,
  text_position_horizontal,
  text_position_vertical,
  title_size,
  description_size,
  display_order,
  is_active
) VALUES (
  'homepage',
  '/images/music-theory-hero.jpg',
  '/images/music-theory-hero-mobile.jpg',
  'Master Music Theory Fundamentals',
  'Practice sight singing, complete assignments, and build a strong foundation in music theory and performance.',
  'Start Learning',
  '/music-theory-fundamentals',
  'center',
  'center',
  'large',
  'medium',
  3,
  true
);