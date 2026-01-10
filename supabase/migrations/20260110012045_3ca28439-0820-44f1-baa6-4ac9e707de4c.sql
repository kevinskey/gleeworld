-- Add Rayne Stewart and Ryan Ellis as handbook editors with executive_board role
INSERT INTO public.app_roles (user_id, role, is_active)
VALUES 
  ('5a7197d5-bf6b-4658-a25d-5dcc99ee6e81', 'executive_board', true),
  ('3577bc07-1ad3-4d4e-bc30-d401a1824874', 'executive_board', true)
ON CONFLICT (user_id, role) DO UPDATE SET is_active = true;