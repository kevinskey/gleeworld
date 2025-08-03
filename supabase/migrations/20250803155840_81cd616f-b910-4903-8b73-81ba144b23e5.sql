-- Delete the profile with misspelled email (avachalenger@spelman.edu) that has no user_id
DELETE FROM public.gw_profiles 
WHERE email = 'avachallenger@spelman.edu' AND user_id IS NULL;

-- Delete the profile with misspelled email (avachalenger@spelman.edu) if it exists with a user_id
DELETE FROM public.gw_profiles 
WHERE email = 'avachalenger@spelman.edu';