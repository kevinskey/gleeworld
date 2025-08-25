-- Remove duplicate profile for adriannahighgate@spelman.edu to prevent confusion
-- Keep only the ad.l.highgate@gmail.com profile which has super-admin role
DELETE FROM public.gw_profiles WHERE email = 'adriannahighgate@spelman.edu';