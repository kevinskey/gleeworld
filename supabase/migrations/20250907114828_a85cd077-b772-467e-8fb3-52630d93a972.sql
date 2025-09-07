-- Add Bowman Scholars module to the app functions
INSERT INTO public.gw_app_functions (function_name, display_name, description, category, is_active, created_by)
VALUES 
  ('bowman-scholars', 'Bowman Scholars', 'Academic excellence program for distinguished students', 'member-management', true, auth.uid())
ON CONFLICT (function_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active;