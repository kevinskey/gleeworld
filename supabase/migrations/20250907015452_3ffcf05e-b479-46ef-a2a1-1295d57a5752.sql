-- Add wardrobe fitting service
INSERT INTO public.gw_services (
  name,
  description,
  category,
  duration_minutes,
  price_amount,
  price_display,
  capacity_min,
  capacity_max,
  is_active
) VALUES (
  'Wardrobe Fitting',
  'Professional wardrobe consultation and fitting for performances',
  'styling',
  45,
  75.00,
  '$75.00',
  1,
  1,
  true
);