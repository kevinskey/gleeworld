-- Update gw_profiles role column for users created today to alumna
UPDATE public.gw_profiles
SET role = 'alumna'
WHERE id IN (
  SELECT id
  FROM auth.users
  WHERE DATE(created_at) = CURRENT_DATE
);