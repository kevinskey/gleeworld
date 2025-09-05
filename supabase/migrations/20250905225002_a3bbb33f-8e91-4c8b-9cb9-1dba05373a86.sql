-- Update Phoenix King's role to member
UPDATE public.gw_profiles 
SET role = 'member', 
    updated_at = now()
WHERE email = 'phoenixk2728@gmail.com';