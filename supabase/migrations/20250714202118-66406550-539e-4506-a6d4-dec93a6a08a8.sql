-- Update RLS policies for gw_announcements to allow admin management
DROP POLICY IF EXISTS "Public can view announcements" ON gw_announcements;

-- Allow admins to manage announcements
CREATE POLICY "Admins can manage announcements"
ON gw_announcements
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE gw_profiles.user_id = auth.uid() 
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  )
);

-- Allow public to view published announcements
CREATE POLICY "Public can view published announcements"
ON gw_announcements
FOR SELECT
TO authenticated
USING (
  (publish_date IS NULL OR publish_date <= now()) 
  AND (expire_date IS NULL OR expire_date > now())
);

-- Allow admins to view all announcements (including drafts)
CREATE POLICY "Admins can view all announcements"
ON gw_announcements
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE gw_profiles.user_id = auth.uid() 
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  )
);