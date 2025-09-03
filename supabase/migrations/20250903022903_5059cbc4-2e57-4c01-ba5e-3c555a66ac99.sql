-- Add the missing modules to Ariana's permissions
INSERT INTO gw_user_module_permissions (user_id, module_id, granted_by, is_active, notes)
VALUES 
  ('6f14998d-a7ba-47f2-a331-5bc44445ec98', 'buckets-of-love', '6f14998d-a7ba-47f2-a331-5bc44445ec98', true, 'Added missing module access'),
  ('6f14998d-a7ba-47f2-a331-5bc44445ec98', 'glee-writing', '6f14998d-a7ba-47f2-a331-5bc44445ec98', true, 'Added missing module access'), 
  ('6f14998d-a7ba-47f2-a331-5bc44445ec98', 'fan-engagement', '6f14998d-a7ba-47f2-a331-5bc44445ec98', true, 'Added missing module access'),
  ('6f14998d-a7ba-47f2-a331-5bc44445ec98', 'scheduling-module', '6f14998d-a7ba-47f2-a331-5bc44445ec98', true, 'Added missing module access'),
  ('6f14998d-a7ba-47f2-a331-5bc44445ec98', 'service-management', '6f14998d-a7ba-47f2-a331-5bc44445ec98', true, 'Added missing module access');