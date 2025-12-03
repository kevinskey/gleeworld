-- Add admin role to user_roles table for Jordyn's accounts
INSERT INTO public.user_roles (user_id, role)
VALUES 
  ('3174dc79-ce30-4199-bf76-c6d60971ba0b', 'admin'),
  ('0e26ecfb-7744-4052-b36e-76b3156596f3', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;