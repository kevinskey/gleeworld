-- Add executive_board role to all section leaders
INSERT INTO public.app_roles (user_id, role, is_active)
VALUES 
  -- Elissa Jefferson (S2 Section Leader)
  ('f4934dc9-31c5-4af9-a587-1d86c4315bdf', 'executive_board', true),
  -- Gabrielle Magee (A2 Section Leader)
  ('ca078422-2259-4303-85c6-9d9738ea88ba', 'executive_board', true),
  -- Dana Thompson (S1 Section Leader)
  ('2da1718f-ee58-4c9e-a7c3-1f523d34970e', 'executive_board', true),
  -- Ariana Swindell (A1 Section Leader)
  ('6f14998d-a7ba-47f2-a331-5bc44445ec98', 'executive_board', true)
ON CONFLICT (user_id, role) DO UPDATE SET is_active = true;