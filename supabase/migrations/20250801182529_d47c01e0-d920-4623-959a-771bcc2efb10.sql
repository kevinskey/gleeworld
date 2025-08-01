-- Clear existing sample data and add proper wardrobe items with zero inventory
DELETE FROM public.wardrobe_items;

-- Insert specific wardrobe items with zero inventory
INSERT INTO public.wardrobe_items (name, category, size_options, color_options, total_quantity, available_quantity, notes) VALUES
-- Formal Wear
('Formal Black Dress', 'formal', ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL'], ARRAY['Black'], 0, 0, 'Long formal black dress for concerts'),
('Formal Black Skirt', 'formal', ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL'], ARRAY['Black'], 0, 0, 'Black A-line skirt for formal performances'),
('Black Blazer', 'formal', ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL'], ARRAY['Black'], 0, 0, 'Professional black blazer'),
('White Dress Shirt', 'formal', ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL'], ARRAY['White'], 0, 0, 'Crisp white button-down shirt'),

-- Accessories
('Pearl Necklace', 'accessories', ARRAY['One Size'], ARRAY['White', 'Cream'], 0, 0, 'Classic pearl necklace for formal events'),
('Pearl Earrings', 'accessories', ARRAY['One Size'], ARRAY['White', 'Cream'], 0, 0, 'Classic pearl stud earrings'),
('Black Hair Bow', 'accessories', ARRAY['One Size'], ARRAY['Black'], 0, 0, 'Satin hair bow for performances'),
('Black Clutch Purse', 'accessories', ARRAY['One Size'], ARRAY['Black'], 0, 0, 'Small black evening clutch'),

-- Cosmetics
('Red Lipstick - MAC Ruby Woo', 'cosmetics', ARRAY['One Size'], ARRAY['Red'], 0, 0, 'Classic red lipstick for performances'),
('Red Lipstick - Revlon Fire & Ice', 'cosmetics', ARRAY['One Size'], ARRAY['Red'], 0, 0, 'Alternative red lipstick option'),
('Foundation - Various Shades', 'cosmetics', ARRAY['One Size'], ARRAY['Light', 'Medium', 'Dark'], 0, 0, 'Performance foundation'),
('Setting Powder', 'cosmetics', ARRAY['One Size'], ARRAY['Translucent'], 0, 0, 'Makeup setting powder'),

-- Casual Wear
('Black Polo Shirt', 'casual', ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL'], ARRAY['Black'], 0, 0, 'Glee Club polo shirt'),
('Navy Polo Shirt', 'casual', ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL'], ARRAY['Navy'], 0, 0, 'Alternative polo shirt'),
('Glee Club T-Shirt', 'casual', ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL'], ARRAY['Maroon', 'Navy'], 0, 0, 'Official Glee Club t-shirt'),

-- Performance Wear
('Performance T-Shirt - Maroon', 'performance', ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL'], ARRAY['Maroon'], 0, 0, 'Maroon performance shirt'),
('Performance T-Shirt - Navy', 'performance', ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL'], ARRAY['Navy'], 0, 0, 'Navy performance shirt'),
('Black Performance Pants', 'performance', ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL'], ARRAY['Black'], 0, 0, 'Black dress pants for performances'),

-- Shoes
('Black Dress Shoes', 'shoes', ARRAY['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11'], ARRAY['Black'], 0, 0, 'Formal black dress shoes'),
('Black Flats', 'shoes', ARRAY['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11'], ARRAY['Black'], 0, 0, 'Comfortable black flats'),

-- Travel/Tour Items
('Glee Club Sweatshirt', 'travel', ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL'], ARRAY['Maroon', 'Navy'], 0, 0, 'Official sweatshirt for travel'),
('Glee Club Jacket', 'travel', ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL'], ARRAY['Black', 'Navy'], 0, 0, 'Official jacket for travel'),
('Travel Bag', 'travel', ARRAY['One Size'], ARRAY['Black', 'Navy'], 0, 0, 'Glee Club branded travel bag'),

-- Special Items
('Graduation Stole', 'special', ARRAY['One Size'], ARRAY['Gold', 'Blue'], 0, 0, 'Ceremonial graduation stole'),
('Pin/Badge', 'special', ARRAY['One Size'], ARRAY['Gold', 'Silver'], 0, 0, 'Official Glee Club pin or badge');