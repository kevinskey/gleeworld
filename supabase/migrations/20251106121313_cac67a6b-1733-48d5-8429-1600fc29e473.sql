-- Add alumna role for all users created today
INSERT INTO public.user_roles (user_id, role)
SELECT 
  id,
  'alumna'::public.app_role
FROM auth.users
WHERE DATE(created_at) = CURRENT_DATE
ON CONFLICT (user_id, role) 
DO NOTHING;