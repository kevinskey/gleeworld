-- Add wardrobe fitting service
INSERT INTO public.gw_services (
  name,
  description,
  category,
  duration_minutes,
  price_cents,
  price_display,
  max_capacity,
  is_active
) VALUES (
  'Wardrobe Fitting',
  'Professional wardrobe consultation and fitting for performances',
  'styling',
  45,
  7500,
  '$75.00',
  1,
  true
);