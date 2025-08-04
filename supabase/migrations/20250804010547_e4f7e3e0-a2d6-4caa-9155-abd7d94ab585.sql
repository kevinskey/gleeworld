-- Update Ava Challenger's email address
UPDATE gw_profiles 
SET email = 'avachallenger@spelman.edu',
    updated_at = now()
WHERE email = 'avachalenger@spelman.edu';