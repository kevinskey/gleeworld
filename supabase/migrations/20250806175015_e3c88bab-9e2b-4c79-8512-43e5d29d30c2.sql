-- Create a test auditioner user so the role shows up in the interface
-- This will temporarily convert one user to auditioner role for testing

UPDATE public.gw_profiles 
SET role = 'auditioner', updated_at = now()
WHERE user_id = '61ba6ef9-1021-450e-af77-ad94b5a66448';