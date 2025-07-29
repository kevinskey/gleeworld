-- Insert missing product categories (skip duplicates)
INSERT INTO public.product_categories (name, description, slug, sort_order) VALUES
('Apparel', 'Clothing and wearable items', 'apparel', 1),
('Performance & Formal Wear', 'Concert attire and formal accessories', 'performance-formal-wear', 3),
('Lifestyle & Home', 'Home décor and lifestyle products', 'lifestyle-home', 4),
('Music & Media', 'Albums, sheet music, and digital content', 'music-media', 5),
('Bundles & Gift Sets', 'Curated product bundles and gift packages', 'bundles-gift-sets', 6),
('Custom Orders', 'Personalized and bulk order items', 'custom-orders', 7)
ON CONFLICT (name) DO NOTHING;

-- Update existing categories to match our structure
UPDATE public.product_categories SET 
  description = 'Bags, hats, and small accessories',
  sort_order = 2
WHERE slug = 'accessories';

-- Insert all sample products using correct column names
INSERT INTO public.products (
  name, description, short_description, price, category_id, sku, tags, stock_quantity, 
  is_active, is_featured, manage_stock, weight, dimensions, metadata
) VALUES
-- Apparel Products
('Spelman Glee Club Classic Tee', 'Premium cotton t-shirt with Glee Club logo. Features the official Spelman College Glee Club logo on a high-quality cotton blend.', 'Premium cotton t-shirt with Glee Club logo', 25.00, 
 (SELECT id FROM product_categories WHERE slug = 'apparel'), 'SGC-TEE-001', 
 ARRAY['SpelmanBlue', 'Classic', 'Tour2025'], 100, true, false, true,
 0.3, '{"length": 28, "width": 20, "height": 1}', '{"variants": [{"name": "Size", "options": ["XS", "S", "M", "L", "XL", "XXL"]}, {"name": "Color", "options": ["Spelman Blue", "White", "Black"]}]}'),

('Women''s Fitted Glee Tee', 'Tailored fit t-shirt designed specifically for women. Features a flattering cut and premium cotton blend.', 'Tailored fit t-shirt for women', 28.00,
 (SELECT id FROM product_categories WHERE slug = 'apparel'), 'SGC-TEE-002',
 ARRAY['WomensCut', 'SpelmanBlue', 'Fitted'], 75, true, false, true,
 0.25, '{"length": 26, "width": 18, "height": 1}', '{"variants": [{"name": "Size", "options": ["XS", "S", "M", "L", "XL"]}, {"name": "Color", "options": ["Spelman Blue", "Pink", "White"]}]}'),

('Long Sleeve Glee Shirt', 'Comfortable long sleeve shirt with embroidered Glee Club logo. Perfect for cooler weather and formal events.', 'Long sleeve with embroidered logo', 32.00,
 (SELECT id FROM product_categories WHERE slug = 'apparel'), 'SGC-LS-001',
 ARRAY['LongSleeve', 'Embroidered', 'Premium'], 60, true, false, true,
 0.4, '{"length": 29, "width": 21, "height": 1}', '{"variants": [{"name": "Size", "options": ["S", "M", "L", "XL", "XXL"]}, {"name": "Color", "options": ["Navy", "Spelman Blue", "Gray"]}]}'),

('Glee Club Hoodie', 'Cozy pullover hoodie with kangaroo pocket and embroidered logo. Perfect for staying warm in style.', 'Cozy pullover hoodie with kangaroo pocket', 55.00,
 (SELECT id FROM product_categories WHERE slug = 'apparel'), 'SGC-HOOD-001',
 ARRAY['Hoodie', 'Comfort', 'SpelmanBlue'], 45, true, true, true,
 0.8, '{"length": 27, "width": 22, "height": 2}', '{"variants": [{"name": "Size", "options": ["S", "M", "L", "XL", "XXL"]}, {"name": "Color", "options": ["Spelman Blue", "Gray", "Black"]}]}'),

('Centennial Sweatshirt', 'Limited edition 100th anniversary crewneck sweatshirt. Commemorates the rich history of the Spelman College Glee Club.', 'Limited edition 100th anniversary crewneck', 48.00,
 (SELECT id FROM product_categories WHERE slug = 'apparel'), 'SGC-CREW-CENT',
 ARRAY['Centennial', 'LimitedEdition', 'Anniversary'], 30, true, true, true,
 0.7, '{"length": 26, "width": 21, "height": 2}', '{"variants": [{"name": "Size", "options": ["S", "M", "L", "XL", "XXL"]}, {"name": "Color", "options": ["Spelman Blue", "Gold"]}]}'),

('Rehearsal Performance Tee', 'Moisture-wicking performance shirt designed for rehearsals and active wear. Lightweight and breathable.', 'Moisture-wicking shirt for rehearsals', 22.00,
 (SELECT id FROM product_categories WHERE slug = 'apparel'), 'SGC-PERF-001',
 ARRAY['Performance', 'Rehearsal', 'Athletic'], 80, true, false, true,
 0.2, '{"length": 27, "width": 19, "height": 1}', '{"variants": [{"name": "Size", "options": ["XS", "S", "M", "L", "XL"]}, {"name": "Color", "options": ["Black", "Navy", "White"]}]}'),

('Youth Glee Club Tee', 'Soft cotton t-shirt designed for young Glee Club fans. Perfect for future members and supporters.', 'Soft cotton tee for young fans', 18.00,
 (SELECT id FROM product_categories WHERE slug = 'apparel'), 'SGC-YOUTH-001',
 ARRAY['Youth', 'Kids', 'SpelmanBlue'], 50, true, false, true,
 0.15, '{"length": 22, "width": 16, "height": 1}', '{"variants": [{"name": "Size", "options": ["YS", "YM", "YL", "YXL"]}, {"name": "Color", "options": ["Spelman Blue", "Pink", "White"]}]}'),

-- Accessories Products
('Glee Club Baseball Cap', 'Structured baseball cap with embroidered Glee Club logo. Adjustable fit for comfort.', 'Embroidered logo on structured cap', 28.00,
 (SELECT id FROM product_categories WHERE slug = 'accessories'), 'SGC-HAT-001',
 ARRAY['Hat', 'Embroidered', 'Classic'], 60, true, false, true,
 0.2, '{"length": 12, "width": 12, "height": 6}', '{"variants": [{"name": "Color", "options": ["Spelman Blue", "Black", "White"]}]}'),

('Beanie Winter Hat', 'Warm knit beanie with Glee Club patch. Perfect for cold weather and casual wear.', 'Warm knit beanie with Glee Club patch', 22.00,
 (SELECT id FROM product_categories WHERE slug = 'accessories'), 'SGC-BEANIE-001',
 ARRAY['Beanie', 'Winter', 'Warm'], 40, true, false, true,
 0.1, '{"length": 10, "width": 10, "height": 4}', '{"variants": [{"name": "Color", "options": ["Spelman Blue", "Gray", "Black"]}]}'),

('Glee Club Tote Bag', 'Large canvas tote bag with reinforced handles and Glee Club logo. Perfect for books, music, and daily essentials.', 'Large canvas tote with reinforced handles', 24.00,
 (SELECT id FROM product_categories WHERE slug = 'accessories'), 'SGC-TOTE-001',
 ARRAY['Tote', 'Canvas', 'Practical'], 70, true, false, true,
 0.3, '{"length": 15, "width": 4, "height": 14}', '{"variants": [{"name": "Color", "options": ["Natural", "Spelman Blue", "Black"]}]}'),

('Drawstring Backpack', 'Lightweight drawstring bag perfect for gym, rehearsals, or everyday use.', 'Lightweight drawstring bag for everyday use', 16.00,
 (SELECT id FROM product_categories WHERE slug = 'accessories'), 'SGC-DRAW-001',
 ARRAY['Backpack', 'Lightweight', 'Students'], 90, true, false, true,
 0.2, '{"length": 14, "width": 1, "height": 17}', '{"variants": [{"name": "Color", "options": ["Spelman Blue", "Black", "Gray"]}]}'),

('Enamel Lapel Pin Set', 'Set of 3 collectible enamel pins featuring different Glee Club designs. Perfect for jackets, bags, or pin boards.', 'Set of 3 collectible enamel pins', 15.00,
 (SELECT id FROM product_categories WHERE slug = 'accessories'), 'SGC-PIN-SET',
 ARRAY['Pins', 'Collectible', 'Set'], 100, true, false, true,
 0.05, '{"length": 4, "width": 4, "height": 1}', '{"variants": [{"name": "Design", "options": ["Classic Logo", "Centennial", "Musical Notes"]}]}'),

('Glee Club Face Mask', 'Reusable fabric face mask with Glee Club logo. Comfortable and washable.', 'Reusable fabric mask with logo', 12.00,
 (SELECT id FROM product_categories WHERE slug = 'accessories'), 'SGC-MASK-001',
 ARRAY['Mask', 'Safety', 'Reusable'], 80, true, false, true,
 0.05, '{"length": 8, "width": 6, "height": 1}', '{"variants": [{"name": "Size", "options": ["Adult", "Youth"]}, {"name": "Color", "options": ["Spelman Blue", "Black"]}]}'),

-- Performance & Formal Wear Products
('Concert Performance Dress', 'Elegant black dress designed for formal performances and concerts. Professional and sophisticated.', 'Elegant black dress for performances', 85.00,
 (SELECT id FROM product_categories WHERE slug = 'performance-formal-wear'), 'SGC-DRESS-001',
 ARRAY['Performance', 'Formal', 'Concert'], 25, true, true, true,
 0.6, '{"length": 36, "width": 14, "height": 2}', '{"variants": [{"name": "Size", "options": ["XS", "S", "M", "L", "XL", "XXL"]}, {"name": "Length", "options": ["Regular", "Petite", "Tall"]}]}'),

('Formal Glee Polo', 'Professional polo shirt perfect for formal events and performances. Classic fit with embroidered logo.', 'Professional polo for formal events', 45.00,
 (SELECT id FROM product_categories WHERE slug = 'performance-formal-wear'), 'SGC-POLO-001',
 ARRAY['Polo', 'Formal', 'Professional'], 40, true, false, true,
 0.3, '{"length": 26, "width": 18, "height": 1}', '{"variants": [{"name": "Size", "options": ["XS", "S", "M", "L", "XL", "XXL"]}, {"name": "Color", "options": ["Navy", "White"]}]}'),

('Pearl Necklace Set', 'Classic pearl necklace and earring set perfect for formal performances and special occasions.', 'Classic pearl necklace and earring set', 35.00,
 (SELECT id FROM product_categories WHERE slug = 'performance-formal-wear'), 'SGC-PEARL-001',
 ARRAY['Pearls', 'Formal', 'Accessories'], 30, true, true, true,
 0.1, '{"length": 8, "width": 8, "height": 2}', '{"variants": [{"name": "Length", "options": ["16 inch", "18 inch", "20 inch"]}]}'),

('Performance Lipstick', 'Long-lasting red lipstick designed for stage performances. Professional quality makeup.', 'Long-lasting red lipstick for performances', 18.00,
 (SELECT id FROM product_categories WHERE slug = 'performance-formal-wear'), 'SGC-LIP-001',
 ARRAY['Makeup', 'Performance', 'LongLasting'], 50, true, false, true,
 0.05, '{"length": 3, "width": 1, "height": 3}', '{"variants": [{"name": "Shade", "options": ["Classic Red", "Deep Red", "Burgundy"]}]}'),

-- Lifestyle & Home Products
('Glee Club Travel Mug', 'Insulated travel mug with Glee Club logo. Keeps beverages hot or cold for hours.', 'Insulated travel mug with logo', 22.00,
 (SELECT id FROM product_categories WHERE slug = 'lifestyle-home'), 'SGC-MUG-001',
 ARRAY['Drinkware', 'Travel', 'Insulated'], 60, true, false, true,
 0.4, '{"length": 8, "width": 8, "height": 12}', '{"variants": [{"name": "Color", "options": ["Spelman Blue", "White", "Stainless"]}]}'),

('Water Bottle with Logo', 'Stainless steel water bottle with Glee Club logo. BPA-free and eco-friendly.', 'Stainless steel water bottle', 26.00,
 (SELECT id FROM product_categories WHERE slug = 'lifestyle-home'), 'SGC-BOTTLE-001',
 ARRAY['WaterBottle', 'Stainless', 'Eco'], 45, true, false, true,
 0.5, '{"length": 7, "width": 7, "height": 10}', '{"variants": [{"name": "Size", "options": ["20oz", "32oz"]}, {"name": "Color", "options": ["Blue", "Silver", "Black"]}]}'),

('Glee Club Notebook', 'Hardcover notebook with embossed Glee Club logo. Perfect for music notes, lyrics, and journaling.', 'Hardcover notebook with embossed logo', 18.00,
 (SELECT id FROM product_categories WHERE slug = 'lifestyle-home'), 'SGC-NOTE-001',
 ARRAY['Stationery', 'Notebook', 'Embossed'], 80, true, false, true,
 0.3, '{"length": 9, "width": 6, "height": 1}', '{"variants": [{"name": "Style", "options": ["Lined", "Blank", "Music Staff"]}]}'),

('Glee Pen Set', 'Set of 3 premium pens with Glee Club logo. Smooth writing and elegant design.', 'Set of 3 premium pens with logo', 15.00,
 (SELECT id FROM product_categories WHERE slug = 'lifestyle-home'), 'SGC-PEN-001',
 ARRAY['Pens', 'Set', 'Premium'], 70, true, false, true,
 0.1, '{"length": 6, "width": 6, "height": 1}', '{"variants": [{"name": "Color", "options": ["Blue Ink", "Black Ink", "Mixed"]}]}'),

('Spelman Glee Candle', 'Soy candle with custom Glee Club scent. Hand-poured with natural ingredients and beautiful packaging.', 'Soy candle with custom Glee Club scent', 28.00,
 (SELECT id FROM product_categories WHERE slug = 'lifestyle-home'), 'SGC-CANDLE-001',
 ARRAY['Candle', 'Soy', 'HomeDecor'], 40, true, true, true,
 0.6, '{"length": 4, "width": 4, "height": 5}', '{"variants": [{"name": "Scent", "options": ["Spelman Gardens", "Music Room", "Concert Hall"]}]}'),

('Throw Pillow', 'Decorative throw pillow with Glee Club design. Soft and comfortable for any room.', 'Decorative pillow with Glee Club design', 32.00,
 (SELECT id FROM product_categories WHERE slug = 'lifestyle-home'), 'SGC-PILLOW-001',
 ARRAY['Pillow', 'HomeDecor', 'Comfort'], 35, true, false, true,
 0.4, '{"length": 16, "width": 16, "height": 6}', '{"variants": [{"name": "Design", "options": ["Logo", "Musical Notes", "Centennial"]}]}'),

-- Music & Media Products  
('Greatest Hits CD', 'Collection of Glee Club''s most beloved performances spanning decades of musical excellence.', 'Collection of most beloved performances', 20.00,
 (SELECT id FROM product_categories WHERE slug = 'music-media'), 'SGC-CD-001',
 ARRAY['CD', 'Music', 'GreatestHits'], 100, true, false, true,
 0.1, '{"length": 5, "width": 5, "height": 0.5}', '{}'),

('Centennial Album Vinyl', 'Limited edition vinyl of 100th anniversary album. High-quality pressing with special packaging.', 'Limited edition vinyl of 100th anniversary album', 45.00,
 (SELECT id FROM product_categories WHERE slug = 'music-media'), 'SGC-VINYL-CENT',
 ARRAY['Vinyl', 'Centennial', 'LimitedEdition'], 50, true, true, true,
 0.5, '{"length": 12, "width": 12, "height": 0.5}', '{"variants": [{"name": "Color", "options": ["Black", "Spelman Blue", "Gold"]}]}'),

('Digital Album Download', 'High-quality digital album download with exclusive bonus tracks and liner notes.', 'High-quality digital album download', 15.00,
 (SELECT id FROM product_categories WHERE slug = 'music-media'), 'SGC-DIG-001',
 ARRAY['Digital', 'Download', 'Music'], 999, true, false, false,
 0, '{"length": 0, "width": 0, "height": 0}', '{"variants": [{"name": "Format", "options": ["MP3", "FLAC", "WAV"]}]}'),

('Sheet Music Collection', 'PDF collection of popular Glee Club arrangements with performance notes and guidance.', 'PDF collection of popular arrangements', 25.00,
 (SELECT id FROM product_categories WHERE slug = 'music-media'), 'SGC-SHEET-001',
 ARRAY['SheetMusic', 'Digital', 'Arrangements'], 999, true, false, false,
 0, '{"length": 0, "width": 0, "height": 0}', '{"variants": [{"name": "Voice Part", "options": ["All Parts", "Soprano", "Alto", "Tenor", "Bass"]}]}'),

('Concert DVD Collection', 'DVD set featuring memorable performances from recent concerts and special events.', 'DVD set of memorable performances', 30.00,
 (SELECT id FROM product_categories WHERE slug = 'music-media'), 'SGC-DVD-001',
 ARRAY['DVD', 'Concert', 'Collection'], 40, true, false, true,
 0.3, '{"length": 7, "width": 5, "height": 1}', '{"variants": [{"name": "Year", "options": ["2023 Concerts", "2024 Concerts", "Complete Collection"]}]}'),

-- Bundles & Gift Sets
('New Member Welcome Kit', 'Complete starter package for new Glee Club members including essential items and exclusive gifts.', 'Complete starter package for new members', 75.00,
 (SELECT id FROM product_categories WHERE slug = 'bundles-gift-sets'), 'SGC-KIT-NEW',
 ARRAY['Bundle', 'NewMember', 'Welcome'], 25, true, true, true,
 1.2, '{"length": 12, "width": 10, "height": 8}', '{"variants": [{"name": "Size", "options": ["S", "M", "L", "XL"]}]}'),

('Tour 2025 Package', 'Exclusive tour merchandise bundle featuring limited edition items and collectibles.', 'Exclusive tour merchandise bundle', 120.00,
 (SELECT id FROM product_categories WHERE slug = 'bundles-gift-sets'), 'SGC-TOUR-2025',
 ARRAY['Tour2025', 'Bundle', 'Exclusive'], 30, true, true, true,
 1.5, '{"length": 14, "width": 12, "height": 10}', '{"variants": [{"name": "Size", "options": ["S", "M", "L", "XL", "XXL"]}]}'),

('Holiday Gift Box', 'Curated selection of Glee Club favorites perfect for gifting during the holiday season.', 'Curated selection of Glee Club favorites', 85.00,
 (SELECT id FROM product_categories WHERE slug = 'bundles-gift-sets'), 'SGC-HOLIDAY-001',
 ARRAY['Holiday', 'GiftBox', 'Curated'], 20, true, true, true,
 1.8, '{"length": 16, "width": 12, "height": 8}', '{"variants": [{"name": "Recipient", "options": ["Member", "Alumni", "Fan", "Family"]}]}'),

('Alumnae Reunion Bundle', 'Special package designed for returning alumnae featuring nostalgic items and new favorites.', 'Special package for returning alumnae', 95.00,
 (SELECT id FROM product_categories WHERE slug = 'bundles-gift-sets'), 'SGC-ALUMNI-001',
 ARRAY['Alumnae', 'Reunion', 'Special'], 15, true, true, true,
 1.4, '{"length": 14, "width": 11, "height": 9}', '{"variants": [{"name": "Decade", "options": ["1970s-80s", "1990s", "2000s", "2010s", "2020s"]}]}'),

-- Custom Orders
('Custom Embroidered Item', 'Personalized embroidery service on any item. Add names, dates, or custom messages.', 'Personalized embroidery on any item', 35.00,
 (SELECT id FROM product_categories WHERE slug = 'custom-orders'), 'SGC-CUSTOM-001',
 ARRAY['Custom', 'Embroidery', 'Personalized'], 10, true, true, true,
 0.3, '{"length": 12, "width": 10, "height": 2}', '{"variants": [{"name": "Item Type", "options": ["T-Shirt", "Hoodie", "Polo", "Hat", "Bag"]}, {"name": "Text Length", "options": ["Name Only", "Name + Year", "Custom Message"]}]}'),

('Bulk Order Discount', 'Special pricing structure for orders of 12 or more items. Contact us for custom quotes.', 'Special pricing for orders of 12+ items', 0.00,
 (SELECT id FROM product_categories WHERE slug = 'custom-orders'), 'SGC-BULK-001',
 ARRAY['Bulk', 'Discount', 'Wholesale'], 999, true, false, false,
 0, '{"length": 0, "width": 0, "height": 0}', '{"variants": [{"name": "Quantity", "options": ["12-24 items", "25-49 items", "50+ items"]}]}'),

('Special Request Item', 'Custom item creation service for products not available in our regular catalog.', 'Custom item not in regular catalog', 50.00,
 (SELECT id FROM product_categories WHERE slug = 'custom-orders'), 'SGC-SPECIAL-001',
 ARRAY['Special', 'Custom', 'Request'], 5, true, true, true,
 0.5, '{"length": 10, "width": 8, "height": 4}', '{"variants": [{"name": "Request Type", "options": ["Design Modification", "Size Alteration", "Color Change", "New Product"]}]}');