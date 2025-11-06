-- Migrate existing alumna users from gw_profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'alumna'::app_role
FROM public.gw_profiles
WHERE role = 'alumna'
ON CONFLICT (user_id, role) DO NOTHING;