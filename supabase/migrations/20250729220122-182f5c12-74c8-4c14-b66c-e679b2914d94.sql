-- Insert product categories
INSERT INTO public.product_categories (name, description, slug, sort_order) VALUES
('Apparel', 'Clothing and wearable items', 'apparel', 1),
('Accessories', 'Bags, hats, and small accessories', 'accessories', 2),
('Performance & Formal Wear', 'Concert attire and formal accessories', 'performance-formal-wear', 3),
('Lifestyle & Home', 'Home décor and lifestyle products', 'lifestyle-home', 4),
('Music & Media', 'Albums, sheet music, and digital content', 'music-media', 5),
('Bundles & Gift Sets', 'Curated product bundles and gift packages', 'bundles-gift-sets', 6),
('Custom Orders', 'Personalized and bulk order items', 'custom-orders', 7);

-- Insert sample products for Apparel category
INSERT INTO public.products (
  title, description, price, category_id, sku, tags, stock_quantity, 
  is_active, variants, stripe_product_id, weight, dimensions
) VALUES
-- T-Shirts
('Spelman Glee Club Classic Tee', 'Premium cotton t-shirt with Glee Club logo', 25.00, 
 (SELECT id FROM product_categories WHERE slug = 'apparel'), 'SGC-TEE-001', 
 ARRAY['SpelmanBlue', 'Classic', 'Tour2025'], 100, true,
 '[{"name": "Size", "options": ["XS", "S", "M", "L", "XL", "XXL"]}, {"name": "Color", "options": ["Spelman Blue", "White", "Black"]}]',
 null, 0.3, '{"length": 28, "width": 20, "height": 1}'),

('Women''s Fitted Glee Tee', 'Tailored fit t-shirt for women', 28.00,
 (SELECT id FROM product_categories WHERE slug = 'apparel'), 'SGC-TEE-002',
 ARRAY['WomensCut', 'SpelmanBlue', 'Fitted'], 75, true,
 '[{"name": "Size", "options": ["XS", "S", "M", "L", "XL"]}, {"name": "Color", "options": ["Spelman Blue", "Pink", "White"]}]',
 null, 0.25, '{"length": 26, "width": 18, "height": 1}'),

('Long Sleeve Glee Shirt', 'Comfortable long sleeve with embroidered logo', 32.00,
 (SELECT id FROM product_categories WHERE slug = 'apparel'), 'SGC-LS-001',
 ARRAY['LongSleeve', 'Embroidered', 'Premium'], 60, true,
 '[{"name": "Size", "options": ["S", "M", "L", "XL", "XXL"]}, {"name": "Color", "options": ["Navy", "Spelman Blue", "Gray"]}]',
 null, 0.4, '{"length": 29, "width": 21, "height": 1}'),

-- Sweatshirts & Hoodies
('Glee Club Hoodie', 'Cozy pullover hoodie with kangaroo pocket', 55.00,
 (SELECT id FROM product_categories WHERE slug = 'apparel'), 'SGC-HOOD-001',
 ARRAY['Hoodie', 'Comfort', 'SpelmanBlue'], 45, true,
 '[{"name": "Size", "options": ["S", "M", "L", "XL", "XXL"]}, {"name": "Color", "options": ["Spelman Blue", "Gray", "Black"]}]',
 null, 0.8, '{"length": 27, "width": 22, "height": 2}'),

('Centennial Sweatshirt', 'Limited edition 100th anniversary crewneck', 48.00,
 (SELECT id FROM product_categories WHERE slug = 'apparel'), 'SGC-CREW-CENT',
 ARRAY['Centennial', 'LimitedEdition', 'Anniversary'], 30, true,
 '[{"name": "Size", "options": ["S", "M", "L", "XL", "XXL"]}, {"name": "Color", "options": ["Spelman Blue", "Gold"]}]',
 null, 0.7, '{"length": 26, "width": 21, "height": 2}'),

-- Performance Wear
('Rehearsal Performance Tee', 'Moisture-wicking shirt for rehearsals', 22.00,
 (SELECT id FROM product_categories WHERE slug = 'apparel'), 'SGC-PERF-001',
 ARRAY['Performance', 'Rehearsal', 'Athletic'], 80, true,
 '[{"name": "Size", "options": ["XS", "S", "M", "L", "XL"]}, {"name": "Color", "options": ["Black", "Navy", "White"]}]',
 null, 0.2, '{"length": 27, "width": 19, "height": 1}'),

-- Kids & Youth
('Youth Glee Club Tee', 'Soft cotton tee for young fans', 18.00,
 (SELECT id FROM product_categories WHERE slug = 'apparel'), 'SGC-YOUTH-001',
 ARRAY['Youth', 'Kids', 'SpelmanBlue'], 50, true,
 '[{"name": "Size", "options": ["YS", "YM", "YL", "YXL"]}, {"name": "Color", "options": ["Spelman Blue", "Pink", "White"]}]',
 null, 0.15, '{"length": 22, "width": 16, "height": 1}');

-- Insert Accessories products
INSERT INTO public.products (
  title, description, price, category_id, sku, tags, stock_quantity, 
  is_active, variants, stripe_product_id, weight, dimensions
) VALUES
-- Hats & Caps
('Glee Club Baseball Cap', 'Embroidered logo on structured cap', 28.00,
 (SELECT id FROM product_categories WHERE slug = 'accessories'), 'SGC-HAT-001',
 ARRAY['Hat', 'Embroidered', 'Classic'], 60, true,
 '[{"name": "Color", "options": ["Spelman Blue", "Black", "White"]}]',
 null, 0.2, '{"length": 12, "width": 12, "height": 6}'),

('Beanie Winter Hat', 'Warm knit beanie with Glee Club patch', 22.00,
 (SELECT id FROM product_categories WHERE slug = 'accessories'), 'SGC-BEANIE-001',
 ARRAY['Beanie', 'Winter', 'Warm'], 40, true,
 '[{"name": "Color", "options": ["Spelman Blue", "Gray", "Black"]}]',
 null, 0.1, '{"length": 10, "width": 10, "height": 4}'),

-- Bags
('Glee Club Tote Bag', 'Large canvas tote with reinforced handles', 24.00,
 (SELECT id FROM product_categories WHERE slug = 'accessories'), 'SGC-TOTE-001',
 ARRAY['Tote', 'Canvas', 'Practical'], 70, true,
 '[{"name": "Color", "options": ["Natural", "Spelman Blue", "Black"]}]',
 null, 0.3, '{"length": 15, "width": 4, "height": 14}'),

('Drawstring Backpack', 'Lightweight drawstring bag for everyday use', 16.00,
 (SELECT id FROM product_categories WHERE slug = 'accessories'), 'SGC-DRAW-001',
 ARRAY['Backpack', 'Lightweight', 'Students'], 90, true,
 '[{"name": "Color", "options": ["Spelman Blue", "Black", "Gray"]}]',
 null, 0.2, '{"length": 14, "width": 1, "height": 17}'),

-- Small Accessories
('Enamel Lapel Pin Set', 'Set of 3 collectible enamel pins', 15.00,
 (SELECT id FROM product_categories WHERE slug = 'accessories'), 'SGC-PIN-SET',
 ARRAY['Pins', 'Collectible', 'Set'], 100, true,
 '[{"name": "Design", "options": ["Classic Logo", "Centennial", "Musical Notes"]}]',
 null, 0.05, '{"length": 4, "width": 4, "height": 1}'),

('Glee Club Face Mask', 'Reusable fabric mask with logo', 12.00,
 (SELECT id FROM product_categories WHERE slug = 'accessories'), 'SGC-MASK-001',
 ARRAY['Mask', 'Safety', 'Reusable'], 80, true,
 '[{"name": "Size", "options": ["Adult", "Youth"]}, {"name": "Color", "options": ["Spelman Blue", "Black"]}]',
 null, 0.05, '{"length": 8, "width": 6, "height": 1}');

-- Insert Performance & Formal Wear products
INSERT INTO public.products (
  title, description, price, category_id, sku, tags, stock_quantity, 
  is_active, variants, stripe_product_id, weight, dimensions
) VALUES
('Concert Performance Dress', 'Elegant black dress for performances', 85.00,
 (SELECT id FROM product_categories WHERE slug = 'performance-formal-wear'), 'SGC-DRESS-001',
 ARRAY['Performance', 'Formal', 'Concert'], 25, true,
 '[{"name": "Size", "options": ["XS", "S", "M", "L", "XL", "XXL"]}, {"name": "Length", "options": ["Regular", "Petite", "Tall"]}]',
 null, 0.6, '{"length": 36, "width": 14, "height": 2}'),

('Formal Glee Polo', 'Professional polo for formal events', 45.00,
 (SELECT id FROM product_categories WHERE slug = 'performance-formal-wear'), 'SGC-POLO-001',
 ARRAY['Polo', 'Formal', 'Professional'], 40, true,
 '[{"name": "Size", "options": ["XS", "S", "M", "L", "XL", "XXL"]}, {"name": "Color", "options": ["Navy", "White"]}]',
 null, 0.3, '{"length": 26, "width": 18, "height": 1}'),

('Pearl Necklace Set', 'Classic pearl necklace and earring set', 35.00,
 (SELECT id FROM product_categories WHERE slug = 'performance-formal-wear'), 'SGC-PEARL-001',
 ARRAY['Pearls', 'Formal', 'Accessories'], 30, true,
 '[{"name": "Length", "options": ["16 inch", "18 inch", "20 inch"]}]',
 null, 0.1, '{"length": 8, "width": 8, "height": 2}'),

('Performance Lipstick', 'Long-lasting red lipstick for performances', 18.00,
 (SELECT id FROM product_categories WHERE slug = 'performance-formal-wear'), 'SGC-LIP-001',
 ARRAY['Makeup', 'Performance', 'LongLasting'], 50, true,
 '[{"name": "Shade", "options": ["Classic Red", "Deep Red", "Burgundy"]}]',
 null, 0.05, '{"length": 3, "width": 1, "height": 3}');

-- Insert Lifestyle & Home products
INSERT INTO public.products (
  title, description, price, category_id, sku, tags, stock_quantity, 
  is_active, variants, stripe_product_id, weight, dimensions
) VALUES
-- Drinkware
('Glee Club Travel Mug', 'Insulated travel mug with logo', 22.00,
 (SELECT id FROM product_categories WHERE slug = 'lifestyle-home'), 'SGC-MUG-001',
 ARRAY['Drinkware', 'Travel', 'Insulated'], 60, true,
 '[{"name": "Color", "options": ["Spelman Blue", "White", "Stainless"]}]',
 null, 0.4, '{"length": 8, "width": 8, "height": 12}'),

('Water Bottle with Logo', 'Stainless steel water bottle', 26.00,
 (SELECT id FROM product_categories WHERE slug = 'lifestyle-home'), 'SGC-BOTTLE-001',
 ARRAY['WaterBottle', 'Stainless', 'Eco'], 45, true,
 '[{"name": "Size", "options": ["20oz", "32oz"]}, {"name": "Color", "options": ["Blue", "Silver", "Black"]}]',
 null, 0.5, '{"length": 7, "width": 7, "height": 10}'),

-- Stationery
('Glee Club Notebook', 'Hardcover notebook with embossed logo', 18.00,
 (SELECT id FROM product_categories WHERE slug = 'lifestyle-home'), 'SGC-NOTE-001',
 ARRAY['Stationery', 'Notebook', 'Embossed'], 80, true,
 '[{"name": "Style", "options": ["Lined", "Blank", "Music Staff"]}]',
 null, 0.3, '{"length": 9, "width": 6, "height": 1}'),

('Glee Pen Set', 'Set of 3 premium pens with logo', 15.00,
 (SELECT id FROM product_categories WHERE slug = 'lifestyle-home'), 'SGC-PEN-001',
 ARRAY['Pens', 'Set', 'Premium'], 70, true,
 '[{"name": "Color", "options": ["Blue Ink", "Black Ink", "Mixed"]}]',
 null, 0.1, '{"length": 6, "width": 6, "height": 1}'),

-- Home Décor
('Spelman Glee Candle', 'Soy candle with custom Glee Club scent', 28.00,
 (SELECT id FROM product_categories WHERE slug = 'lifestyle-home'), 'SGC-CANDLE-001',
 ARRAY['Candle', 'Soy', 'HomeDecor'], 40, true,
 '[{"name": "Scent", "options": ["Spelman Gardens", "Music Room", "Concert Hall"]}]',
 null, 0.6, '{"length": 4, "width": 4, "height": 5}'),

('Throw Pillow', 'Decorative pillow with Glee Club design', 32.00,
 (SELECT id FROM product_categories WHERE slug = 'lifestyle-home'), 'SGC-PILLOW-001',
 ARRAY['Pillow', 'HomeDecor', 'Comfort'], 35, true,
 '[{"name": "Design", "options": ["Logo", "Musical Notes", "Centennial"]}]',
 null, 0.4, '{"length": 16, "width": 16, "height": 6}');

-- Insert Music & Media products
INSERT INTO public.products (
  title, description, price, category_id, sku, tags, stock_quantity, 
  is_active, variants, stripe_product_id, weight, dimensions
) VALUES
('Greatest Hits CD', 'Collection of Glee Club''s most beloved performances', 20.00,
 (SELECT id FROM product_categories WHERE slug = 'music-media'), 'SGC-CD-001',
 ARRAY['CD', 'Music', 'GreatestHits'], 100, true,
 '[]',
 null, 0.1, '{"length": 5, "width": 5, "height": 0.5}'),

('Centennial Album Vinyl', 'Limited edition vinyl of 100th anniversary album', 45.00,
 (SELECT id FROM product_categories WHERE slug = 'music-media'), 'SGC-VINYL-CENT',
 ARRAY['Vinyl', 'Centennial', 'LimitedEdition'], 50, true,
 '[{"name": "Color", "options": ["Black", "Spelman Blue", "Gold"]}]',
 null, 0.5, '{"length": 12, "width": 12, "height": 0.5}'),

('Digital Album Download', 'High-quality digital album download', 15.00,
 (SELECT id FROM product_categories WHERE slug = 'music-media'), 'SGC-DIG-001',
 ARRAY['Digital', 'Download', 'Music'], 999, true,
 '[{"name": "Format", "options": ["MP3", "FLAC", "WAV"]}]',
 null, 0, '{"length": 0, "width": 0, "height": 0}'),

('Sheet Music Collection', 'PDF collection of popular Glee Club arrangements', 25.00,
 (SELECT id FROM product_categories WHERE slug = 'music-media'), 'SGC-SHEET-001',
 ARRAY['SheetMusic', 'Digital', 'Arrangements'], 999, true,
 '[{"name": "Voice Part", "options": ["All Parts", "Soprano", "Alto", "Tenor", "Bass"]}]',
 null, 0, '{"length": 0, "width": 0, "height": 0}'),

('Concert DVD Collection', 'DVD set of memorable performances', 30.00,
 (SELECT id FROM product_categories WHERE slug = 'music-media'), 'SGC-DVD-001',
 ARRAY['DVD', 'Concert', 'Collection'], 40, true,
 '[{"name": "Year", "options": ["2023 Concerts", "2024 Concerts", "Complete Collection"]}]',
 null, 0.3, '{"length": 7, "width": 5, "height": 1}');

-- Insert Bundles & Gift Sets
INSERT INTO public.products (
  title, description, price, category_id, sku, tags, stock_quantity, 
  is_active, variants, stripe_product_id, weight, dimensions
) VALUES
('New Member Welcome Kit', 'Complete starter package for new Glee Club members', 75.00,
 (SELECT id FROM product_categories WHERE slug = 'bundles-gift-sets'), 'SGC-KIT-NEW',
 ARRAY['Bundle', 'NewMember', 'Welcome'], 25, true,
 '[{"name": "Size", "options": ["S", "M", "L", "XL"]}]',
 null, 1.2, '{"length": 12, "width": 10, "height": 8}'),

('Tour 2025 Package', 'Exclusive tour merchandise bundle', 120.00,
 (SELECT id FROM product_categories WHERE slug = 'bundles-gift-sets'), 'SGC-TOUR-2025',
 ARRAY['Tour2025', 'Bundle', 'Exclusive'], 30, true,
 '[{"name": "Size", "options": ["S", "M", "L", "XL", "XXL"]}]',
 null, 1.5, '{"length": 14, "width": 12, "height": 10}'),

('Holiday Gift Box', 'Curated selection of Glee Club favorites', 85.00,
 (SELECT id FROM product_categories WHERE slug = 'bundles-gift-sets'), 'SGC-HOLIDAY-001',
 ARRAY['Holiday', 'GiftBox', 'Curated'], 20, true,
 '[{"name": "Recipient", "options": ["Member", "Alumni", "Fan", "Family"]}]',
 null, 1.8, '{"length": 16, "width": 12, "height": 8}'),

('Alumnae Reunion Bundle', 'Special package for returning alumnae', 95.00,
 (SELECT id FROM product_categories WHERE slug = 'bundles-gift-sets'), 'SGC-ALUMNI-001',
 ARRAY['Alumnae', 'Reunion', 'Special'], 15, true,
 '[{"name": "Decade", "options": ["1970s-80s", "1990s", "2000s", "2010s", "2020s"]}]',
 null, 1.4, '{"length": 14, "width": 11, "height": 9}');

-- Insert Custom Orders category placeholder
INSERT INTO public.products (
  title, description, price, category_id, sku, tags, stock_quantity, 
  is_active, variants, stripe_product_id, weight, dimensions
) VALUES
('Custom Embroidered Item', 'Personalized embroidery on any item', 35.00,
 (SELECT id FROM product_categories WHERE slug = 'custom-orders'), 'SGC-CUSTOM-001',
 ARRAY['Custom', 'Embroidery', 'Personalized'], 10, true,
 '[{"name": "Item Type", "options": ["T-Shirt", "Hoodie", "Polo", "Hat", "Bag"]}, {"name": "Text Length", "options": ["Name Only", "Name + Year", "Custom Message"]}]',
 null, 0.3, '{"length": 12, "width": 10, "height": 2}'),

('Bulk Order Discount', 'Special pricing for orders of 12+ items', 0.00,
 (SELECT id FROM product_categories WHERE slug = 'custom-orders'), 'SGC-BULK-001',
 ARRAY['Bulk', 'Discount', 'Wholesale'], 999, true,
 '[{"name": "Quantity", "options": ["12-24 items", "25-49 items", "50+ items"]}]',
 null, 0, '{"length": 0, "width": 0, "height": 0}'),

('Special Request Item', 'Custom item not in regular catalog', 50.00,
 (SELECT id FROM product_categories WHERE slug = 'custom-orders'), 'SGC-SPECIAL-001',
 ARRAY['Special', 'Custom', 'Request'], 5, true,
 '[{"name": "Request Type", "options": ["Design Modification", "Size Alteration", "Color Change", "New Product"]}]',
 null, 0.5, '{"length": 10, "width": 8, "height": 4}');