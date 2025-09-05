-- Remove the duplicate Phoenix King profile and any associated permissions
-- Delete any username permissions for the Spelman email
DELETE FROM public.username_permissions WHERE user_email = 'phoenixking@spelman.edu';

-- Delete the duplicate profile that has no user_id
DELETE FROM public.gw_profiles WHERE email = 'phoenixking@spelman.edu' AND user_id IS NULL;