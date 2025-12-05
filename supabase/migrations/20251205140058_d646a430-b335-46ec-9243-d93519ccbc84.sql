
-- Delete orphan profiles (no user_id linked) for members with multiple accounts

-- Delete Elissa Jefferson orphan profile
DELETE FROM gw_profiles 
WHERE id = '80f100c4-64a8-4e2e-b06c-8dc67c053c9d' 
AND user_id IS NULL;

-- Delete Gabrielle MaGee orphan profile
DELETE FROM gw_profiles 
WHERE id = '0c147b71-cb85-4855-b206-6583733836b0' 
AND user_id IS NULL;
