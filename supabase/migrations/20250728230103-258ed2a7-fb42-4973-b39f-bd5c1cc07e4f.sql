-- Insert comprehensive GleeWorld product catalog
INSERT INTO public.gw_products (
  title, description, price, product_type, inventory_quantity, tags, is_active, vendor, weight, requires_shipping, images
) VALUES 

-- T-SHIRTS
('Spelman Glee Club Classic Tee', 'Premium cotton t-shirt featuring the iconic Spelman Glee Club logo. Unisex fit perfect for everyday wear.', 24.99, 'tshirts', 100, ARRAY['Centennial', 'Unisex', 'Classic'], true, 'GleeWorld', 0.3, true, ARRAY['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500']),
('Centennial Anniversary Tee', 'Limited edition 100th anniversary commemorative t-shirt with gold foil accents and heritage design.', 29.99, 'tshirts', 50, ARRAY['Centennial', 'Limited Edition', 'Anniversary'], true, 'GleeWorld', 0.3, true, ARRAY['https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?w=500']),
('Tour Essentials Long Sleeve', 'Performance-ready long sleeve tee perfect for rehearsals and tours. Moisture-wicking fabric.', 32.99, 'tshirts', 75, ARRAY['Tour', 'Performance', 'Long Sleeve'], true, 'GleeWorld', 0.4, true, ARRAY['https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=500']),

-- HOODIES
('Spelman Blue Heritage Hoodie', 'Cozy pullover hoodie in signature Spelman blue with embroidered crest. Perfect for chilly rehearsals.', 54.99, 'hoodies', 60, ARRAY['Heritage', 'Pullover', 'Winter'], true, 'GleeWorld', 1.2, true, ARRAY['https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500']),
('Zip-Up Performance Hoodie', 'Athletic-style zip hoodie with kangaroo pockets and drawstring hood. Tour-approved comfort.', 59.99, 'hoodies', 45, ARRAY['Athletic', 'Zip-up', 'Tour'], true, 'GleeWorld', 1.3, true, ARRAY['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500']),

-- SWEATSHIRTS
('Classic Crewneck Sweatshirt', 'Timeless crewneck featuring vintage Glee Club typography. Soft fleece interior for ultimate comfort.', 49.99, 'sweatshirts', 80, ARRAY['Classic', 'Vintage', 'Comfort'], true, 'GleeWorld', 1.0, true, ARRAY['https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=500']),
('Alumni Exclusive Sweatshirt', 'Special edition crewneck exclusively for Glee Club alumnae. Features graduation year customization.', 55.99, 'sweatshirts', 30, ARRAY['Alumni', 'Exclusive', 'Customizable'], true, 'GleeWorld', 1.1, true, ARRAY['https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=500']),

-- JACKETS
('Varsity Style Performance Jacket', 'Classic varsity jacket with leather sleeves and wool body. Perfect for formal performances and events.', 129.99, 'jackets', 25, ARRAY['Varsity', 'Performance', 'Formal'], true, 'GleeWorld', 2.0, true, ARRAY['https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=500']),
('Tour Windbreaker', 'Lightweight windbreaker perfect for travel and outdoor performances. Water-resistant with packable design.', 69.99, 'jackets', 40, ARRAY['Tour', 'Lightweight', 'Travel'], true, 'GleeWorld', 0.8, true, ARRAY['https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=500']),

-- HATS
('Spelman Glee Dad Hat', 'Comfortable dad hat with adjustable strap and embroidered logo. Perfect for casual wear.', 22.99, 'hats', 120, ARRAY['Dad Hat', 'Casual', 'Adjustable'], true, 'GleeWorld', 0.2, true, ARRAY['https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500']),
('Centennial Baseball Cap', 'Structured baseball cap celebrating 100 years of musical excellence. Premium embroidery and fit.', 26.99, 'hats', 85, ARRAY['Baseball Cap', 'Centennial', 'Structured'], true, 'GleeWorld', 0.2, true, ARRAY['https://images.unsplash.com/photo-1575428652377-a2d80d7a41f2?w=500']),
('Winter Beanie', 'Warm knit beanie for cold weather performances and winter events. Cuffed design with logo patch.', 18.99, 'hats', 90, ARRAY['Beanie', 'Winter', 'Warm'], true, 'GleeWorld', 0.1, true, ARRAY['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500']),

-- POLOS
('Performance Polo Shirt', 'Professional polo perfect for formal events and performances. Moisture-wicking fabric with embroidered logo.', 39.99, 'polos', 65, ARRAY['Performance', 'Professional', 'Formal'], true, 'GleeWorld', 0.4, true, ARRAY['https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500']),
('Tour Essential Polo', 'Comfortable touring polo with easy-care fabric. Perfect for travel days and casual performances.', 34.99, 'polos', 70, ARRAY['Tour', 'Travel', 'Easy Care'], true, 'GleeWorld', 0.4, true, ARRAY['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500']),

-- DRINKWARE
('Ceramic Glee Club Mug', 'Beautiful ceramic mug featuring the Glee Club crest and inspiring quotes. Perfect for morning coffee.', 16.99, 'drinkware', 150, ARRAY['Ceramic', 'Coffee', 'Crest'], true, 'GleeWorld', 0.5, true, ARRAY['https://images.unsplash.com/photo-1514228742587-6b1558fcf93a?w=500']),
('Insulated Travel Tumbler', 'Stainless steel tumbler keeps drinks hot or cold for hours. Perfect for long rehearsals and performances.', 24.99, 'drinkware', 100, ARRAY['Insulated', 'Travel', 'Stainless Steel'], true, 'GleeWorld', 0.6, true, ARRAY['https://images.unsplash.com/photo-1534367507873-d2d7e24c797f?w=500']),
('Water Bottle - Glee Branded', 'BPA-free water bottle with motivational quotes and Glee Club branding. Stay hydrated in style.', 19.99, 'drinkware', 125, ARRAY['Water Bottle', 'BPA-Free', 'Motivational'], true, 'GleeWorld', 0.4, true, ARRAY['https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500']),

-- KEEPSAKES
('Centennial Commemorative Pin', 'Limited edition enamel pin celebrating 100 years of Glee Club excellence. Collector quality with backing card.', 12.99, 'keepsakes', 200, ARRAY['Centennial', 'Enamel Pin', 'Collectible'], true, 'GleeWorld', 0.05, true, ARRAY['https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=500']),
('Heritage Tote Bag', 'Sturdy canvas tote bag perfect for carrying sheet music and personal items. Features vintage Glee Club design.', 28.99, 'keepsakes', 80, ARRAY['Tote Bag', 'Canvas', 'Heritage'], true, 'GleeWorld', 0.3, true, ARRAY['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500']),
('Glee Club Lanyard', 'High-quality lanyard with detachable buckle and safety breakaway. Perfect for ID badges and keys.', 8.99, 'keepsakes', 300, ARRAY['Lanyard', 'Safety', 'Practical'], true, 'GleeWorld', 0.02, true, ARRAY['https://images.unsplash.com/photo-1586953209448-b95b79798b11?w=500']),

-- SHEET MUSIC
('Amaze & Inspire Songbook', 'Comprehensive collection of Glee Club favorites including arrangements and performance notes. 50+ songs.', 34.99, 'sheet_music', 75, ARRAY['Songbook', 'Collection', 'Performance'], true, 'GleeWorld', 0.8, true, ARRAY['https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500']),
('Centennial Concert Selections', 'Special edition sheet music from the 100th anniversary concert. Professional arrangements with historical notes.', 29.99, 'sheet_music', 50, ARRAY['Centennial', 'Concert', 'Historical'], true, 'GleeWorld', 0.6, true, ARRAY['https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=500']),

-- RECORDINGS
('Live Concert Album - Centennial', 'High-quality recording of the 100th anniversary concert. Digital download with liner notes and photos.', 19.99, 'recordings', 999, ARRAY['Live', 'Centennial', 'Digital'], true, 'GleeWorld', 0, false, ARRAY['https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500']),
('Greatest Hits Collection', 'Curated collection of the most beloved Glee Club performances spanning decades of musical excellence.', 24.99, 'recordings', 999, ARRAY['Greatest Hits', 'Collection', 'Digital'], true, 'GleeWorld', 0, false, ARRAY['https://images.unsplash.com/photo-1471478331149-c72f17e33c73?w=500']),

-- PERFORMANCES
('Virtual Concert Access - Holiday Special', 'Exclusive access to recorded holiday concert with behind-the-scenes content and interviews.', 15.99, 'performances', 999, ARRAY['Virtual', 'Holiday', 'Exclusive'], true, 'GleeWorld', 0, false, ARRAY['https://images.unsplash.com/photo-1501612780327-45045538702b?w=500']),
('Master Class Recording Series', 'Professional recordings of master classes featuring renowned vocal coaches and Glee Club alumni.', 39.99, 'performances', 999, ARRAY['Master Class', 'Educational', 'Alumni'], true, 'GleeWorld', 0, false, ARRAY['https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500']),

-- MUSICAL LESSONS
('Vocal Warm-Up Essentials', 'Comprehensive vocal warm-up program with MP3 tracks and PDF guides. Perfect for daily practice.', 19.99, 'musical_lessons', 999, ARRAY['Vocal', 'Warm-up', 'Practice'], true, 'GleeWorld', 0, false, ARRAY['https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500']),
('Sight Singing Mastery Course', 'Progressive sight singing course with video lessons, exercises, and progress tracking. All skill levels.', 49.99, 'musical_lessons', 999, ARRAY['Sight Singing', 'Course', 'Progressive'], true, 'GleeWorld', 0, false, ARRAY['https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=500']),
('Leadership Workshop - Amaze & Inspire', 'Digital workshop focusing on musical leadership and inspiring others through performance and community.', 29.99, 'musical_lessons', 999, ARRAY['Leadership', 'Workshop', 'Inspire'], true, 'GleeWorld', 0, false, ARRAY['https://images.unsplash.com/photo-1501612780327-45045538702b?w=500']);