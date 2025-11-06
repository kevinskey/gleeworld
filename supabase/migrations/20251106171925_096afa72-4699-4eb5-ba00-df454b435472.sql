-- Bootstrap admin role for first user
INSERT INTO public.user_roles (user_id, role)
VALUES ('4e6c2ec0-1f83-449a-a984-8920f6056ab5', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;