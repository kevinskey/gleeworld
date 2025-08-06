-- Update profiles to auditioner role for users who have auditions in gw_auditions
UPDATE public.gw_profiles 
SET 
  role = 'auditioner',
  verified = true,
  updated_at = now()
WHERE user_id IN (
  SELECT DISTINCT user_id FROM public.gw_auditions
) 
AND role NOT IN ('admin', 'super-admin');