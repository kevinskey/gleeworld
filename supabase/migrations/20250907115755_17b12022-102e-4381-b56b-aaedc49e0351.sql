-- Add Bowman Scholars module to gw_modules table
INSERT INTO public.gw_modules (name, key, description, category, is_active, default_permissions)
VALUES 
  ('Bowman Scholars', 'bowman-scholars', 'Academic excellence program for distinguished students', 'member-management', true, '{"can_view": true, "can_manage": false}')
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active,
  default_permissions = EXCLUDED.default_permissions;