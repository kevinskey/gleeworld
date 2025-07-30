-- Grant admin access to view audition logs for testing
UPDATE public.gw_profiles 
SET is_admin = true
WHERE email = 'kpj64110@gmail.com';