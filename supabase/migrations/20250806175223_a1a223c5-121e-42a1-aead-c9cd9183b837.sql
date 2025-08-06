-- Fix auditioner role assignment using the correct gw_auditions table
-- Update users who have audition applications in gw_auditions to have auditioner role

UPDATE public.gw_profiles 
SET 
  role = 'auditioner',
  updated_at = now()
WHERE user_id IN (
  SELECT DISTINCT user_id 
  FROM public.gw_auditions 
  WHERE status IN ('pending', 'submitted', 'under_review')
)
AND role NOT IN ('admin', 'super-admin');