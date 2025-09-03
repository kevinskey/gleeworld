-- Change Arianna back to member role so she gets standard member modules
UPDATE gw_profiles 
SET role = 'member'
WHERE email = 'arianaswindell@spelman.edu';