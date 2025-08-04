-- Fix admin access to gw_profiles table
DROP POLICY IF EXISTS "Admins can view all profiles" ON gw_profiles;
CREATE POLICY "Admins can view all profiles" 
ON gw_profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles p 
    WHERE p.user_id = auth.uid() 
    AND (p.is_admin = true OR p.is_super_admin = true OR p.role IN ('admin', 'super-admin'))
  )
);

-- Fix admin access to gw_executive_board_members table  
DROP POLICY IF EXISTS "Admins can view all executive board members" ON gw_executive_board_members;
CREATE POLICY "Admins can view all executive board members"
ON gw_executive_board_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles p 
    WHERE p.user_id = auth.uid() 
    AND (p.is_admin = true OR p.is_super_admin = true OR p.role IN ('admin', 'super-admin'))
  )
);

-- Fix admin access to activity_logs table
DROP POLICY IF EXISTS "Admins can view all activity logs" ON activity_logs;
CREATE POLICY "Admins can view all activity logs"
ON activity_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles p 
    WHERE p.user_id = auth.uid() 
    AND (p.is_admin = true OR p.is_super_admin = true OR p.role IN ('admin', 'super-admin'))
  )
);

-- Add missing admin policies for user preferences table
DROP POLICY IF EXISTS "Admins can view all user preferences" ON gw_user_preferences;
CREATE POLICY "Admins can view all user preferences"
ON gw_user_preferences FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles p 
    WHERE p.user_id = auth.uid() 
    AND (p.is_admin = true OR p.is_super_admin = true OR p.role IN ('admin', 'super-admin'))
  )
);

-- Add admin policies for dashboard_settings table
DROP POLICY IF EXISTS "Admins can manage dashboard settings" ON dashboard_settings;
CREATE POLICY "Admins can manage dashboard settings"
ON dashboard_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles p 
    WHERE p.user_id = auth.uid() 
    AND (p.is_admin = true OR p.is_super_admin = true OR p.role IN ('admin', 'super-admin'))
  )
);