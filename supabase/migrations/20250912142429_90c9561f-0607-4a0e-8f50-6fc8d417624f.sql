-- Ensure Glee Academy and QR Code Management exist in gw_modules and are active

-- Create Glee Academy module if missing
INSERT INTO public.gw_modules (key, name, description, category, is_active)
SELECT 'glee-academy', 'glee-academy', 'Music education platform with courses and private lessons', 'musical-leadership', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.gw_modules WHERE key = 'glee-academy'
);

-- Create QR Code Management module if missing
INSERT INTO public.gw_modules (key, name, description, category, is_active)
SELECT 'qr-code-management', 'qr-code-management', 'Generate and manage attendance QR codes for any event or class', 'system', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.gw_modules WHERE key = 'qr-code-management'
);

-- Update existing rows to ensure correct metadata and activation
UPDATE public.gw_modules
SET description = 'Music education platform with courses and private lessons',
    category = 'musical-leadership',
    is_active = true
WHERE key = 'glee-academy';

UPDATE public.gw_modules
SET description = 'Generate and manage attendance QR codes for any event or class',
    category = 'system',
    is_active = true
WHERE key = 'qr-code-management';