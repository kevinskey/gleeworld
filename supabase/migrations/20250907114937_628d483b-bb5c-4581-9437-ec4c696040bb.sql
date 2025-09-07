-- Add Bowman Scholars module to the app functions
INSERT INTO public.gw_app_functions (name, description, category, module, is_active)
VALUES 
  ('Bowman Scholars', 'Academic excellence program for distinguished students', 'member-management', 'bowman-scholars', true)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  module = EXCLUDED.module,
  is_active = EXCLUDED.is_active;