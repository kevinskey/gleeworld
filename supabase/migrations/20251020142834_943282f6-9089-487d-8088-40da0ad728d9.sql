-- Seed sample dashboard hero slides pointing to local public images
DELETE FROM dashboard_hero_slides 
WHERE image_url IN ('/images/hero-glee-1.jpg','/images/hero-glee-2.jpg','/images/hero-glee-3.jpg');

INSERT INTO dashboard_hero_slides 
  (title, description, image_url, mobile_image_url, ipad_image_url, display_order, is_active)
VALUES
  ('Spelman Glee Club — Live in Concert', 'To Amaze and Inspire.', '/images/hero-glee-1.jpg', '/images/hero-glee-1.jpg', '/images/hero-glee-1.jpg', 1, true),
  ('Christmas at Spelman', 'A season of joy and tradition.', '/images/hero-glee-2.jpg', '/images/hero-glee-2.jpg', '/images/hero-glee-2.jpg', 2, true),
  ('Carols and Classics', 'Harmony, heritage, and hope.', '/images/hero-glee-3.jpg', '/images/hero-glee-3.jpg', '/images/hero-glee-3.jpg', 3, true);
