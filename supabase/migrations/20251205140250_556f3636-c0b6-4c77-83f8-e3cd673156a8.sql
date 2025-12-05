
-- Delete orphan profiles (user_id IS NULL) for members with multiple accounts

-- Jordan Marshall orphan (same gmail as linked)
DELETE FROM gw_profiles 
WHERE full_name = 'Jordan Marshall' 
AND email = 'Jjmarsh27@gmail.com'
AND user_id IS NULL;

-- Madisyn Washington orphan
DELETE FROM gw_profiles 
WHERE full_name = 'Madisyn Washington' 
AND email = 'madisynwashington@spelman.edu'
AND user_id IS NULL;

-- Ryan Bates orphan
DELETE FROM gw_profiles 
WHERE full_name = 'Ryan Bates' 
AND email = 'ryanbates@spelman.edu'
AND user_id IS NULL;

-- Sage Mae orphan
DELETE FROM gw_profiles 
WHERE full_name = 'Sage Mae' 
AND email = 'sagemae@spelman.edu'
AND user_id IS NULL;

-- Sanaia Harrison orphan
DELETE FROM gw_profiles 
WHERE full_name = 'Sanaia Harrison' 
AND email = 'sanaiaharrison@spelman.edu'
AND user_id IS NULL;
