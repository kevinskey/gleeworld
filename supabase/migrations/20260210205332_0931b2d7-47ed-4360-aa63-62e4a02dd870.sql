
INSERT INTO public.gw_user_module_permissions (user_id, module_id, granted_by, is_active)
VALUES
  ('5982b188-02c6-48dd-ba12-56221d6c19a5', 'fd22733f-83b6-477d-907f-8689a36eca02', '715abcbd-9700-405b-bb02-522124be914c', true),
  ('1d57da77-8738-4151-8ae8-486c6e41c229', 'fd22733f-83b6-477d-907f-8689a36eca02', '715abcbd-9700-405b-bb02-522124be914c', true),
  ('04f14d47-25ba-4632-9d4e-2407d2c3797b', 'fd22733f-83b6-477d-907f-8689a36eca02', '715abcbd-9700-405b-bb02-522124be914c', true),
  ('c9260ed4-144d-439b-be51-bd0f387b5ae6', 'fd22733f-83b6-477d-907f-8689a36eca02', '715abcbd-9700-405b-bb02-522124be914c', true),
  ('fdeeab45-8655-43f0-a77b-edb7c5dc9078', 'fd22733f-83b6-477d-907f-8689a36eca02', '715abcbd-9700-405b-bb02-522124be914c', true)
ON CONFLICT DO NOTHING;
