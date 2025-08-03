-- Fix Community Hub permissions to allow all authenticated users proper access
-- Using correct column names from database schema

-- 1. Fix gw_prayer_requests: Allow all authenticated users to view shared prayer requests
DROP POLICY IF EXISTS "Users can view their own prayer requests" ON gw_prayer_requests;
CREATE POLICY "Users can view prayer requests" 
ON gw_prayer_requests 
FOR SELECT 
TO authenticated
USING (
  -- Users can view their own requests OR view anonymous requests OR published/approved ones
  (auth.uid() = user_id) OR 
  (is_anonymous = true) OR
  (status = 'approved') OR
  -- Chaplains and admins can view all
  (EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR role = 'chaplain')
  )) OR
  (EXISTS (
    SELECT 1 FROM gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND position = 'chaplain' 
    AND is_active = true
  ))
);

-- 2. Fix gw_spiritual_reflections: Allow all members to view shared reflections
DROP POLICY IF EXISTS "Members can view shared reflections" ON gw_spiritual_reflections;
CREATE POLICY "Members can view shared reflections"
ON gw_spiritual_reflections
FOR SELECT
TO authenticated
USING (
  -- Anyone can view if shared to members and published
  ((is_shared_to_members = true OR visibility = 'public') AND (is_published = true OR is_published IS NULL)) OR
  -- Chaplains and admins can view all
  (EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR role = 'chaplain')
  )) OR
  -- Creator can view their own
  (auth.uid() = created_by)
);

-- 3. Fix gw_communications: Allow authenticated users to view communications
CREATE POLICY "Authenticated users can view communications"
ON gw_communications
FOR SELECT
TO authenticated
USING (
  -- All authenticated users can view published communications
  (status = 'published') OR
  -- Creators, admins, and exec board can view all
  (auth.uid() = created_by) OR
  (EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )) OR
  (EXISTS (
    SELECT 1 FROM gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND is_active = true
  ))
);

-- 4. Allow authenticated users to create communications/notifications
CREATE POLICY "Authenticated users can create communications"
ON gw_communications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- 5. Fix gw_sheet_music: Allow all authenticated users to view and annotate public scores
CREATE POLICY "Authenticated users can view public sheet music"
ON gw_sheet_music
FOR SELECT
TO authenticated
USING (
  (is_public = true) OR
  -- Creators, admins can view all
  (auth.uid() = created_by) OR
  (EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  ))
);

-- 6. Ensure all authenticated users can access calendar events  
CREATE POLICY "Authenticated users can view calendar events"
ON gw_events
FOR SELECT
TO authenticated
USING (
  -- Public events
  (is_public = true) OR
  (is_private = false OR is_private IS NULL) OR
  -- Private events for members
  (is_private = true AND EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('member', 'alumna', 'executive', 'admin', 'super-admin')
  )) OR
  -- Event creators and admins
  (auth.uid() = created_by) OR
  (EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR is_exec_board = true)
  ))
);

-- 7. Allow authenticated users to send internal notifications
CREATE POLICY "Authenticated users can send notifications"
ON gw_notifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- Users can send notifications to themselves or if they have permission
  (auth.uid() = user_id) OR
  (EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR is_exec_board = true)
  ))
);

-- 8. Allow all authenticated users to view announcements
CREATE POLICY "Authenticated users can view announcements"
ON gw_announcements
FOR SELECT
TO authenticated
USING (
  -- Published announcements within date range
  (
    (publish_date IS NULL OR publish_date <= now()) AND
    (expire_date IS NULL OR expire_date > now())
  ) OR
  -- Admins can view all
  (EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  ))
);