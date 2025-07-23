-- Sync existing avatar URLs from profiles to gw_profiles
UPDATE gw_profiles 
SET avatar_url = profiles.avatar_url,
    updated_at = now()
FROM profiles 
WHERE gw_profiles.user_id = profiles.id 
  AND profiles.avatar_url IS NOT NULL 
  AND (gw_profiles.avatar_url IS NULL OR gw_profiles.avatar_url != profiles.avatar_url);