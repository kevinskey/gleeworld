-- Grant super-admin privileges to current user (Ariana Swindell)
UPDATE public.gw_profiles 
SET 
  is_super_admin = true,
  is_admin = true,
  updated_at = now()
WHERE email = 'arianaswindell@spelman.edu' AND user_id = '6f14998d-a7ba-47f2-a331-5bc44445ec98';