-- Update fans to students if they registered after July 25, 2025
UPDATE public.gw_profiles 
SET role = 'student',
    updated_at = now()
WHERE role = 'fan' 
AND created_at > '2025-07-25'::date;