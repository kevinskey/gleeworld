-- Update RLS policies for wardrobe tables to allow all executive board members access

-- Drop the restrictive policies that only allow wardrobe_manager
DROP POLICY IF EXISTS "Wardrobe managers and admins can manage inventory" ON gw_wardrobe_inventory;
DROP POLICY IF EXISTS "Wardrobe managers and admins can manage checkouts" ON gw_wardrobe_checkouts;
DROP POLICY IF EXISTS "Wardrobe managers and admins can manage announcements" ON gw_wardrobe_announcements;
DROP POLICY IF EXISTS "Wardrobe managers and admins can manage files" ON gw_wardrobe_files;
DROP POLICY IF EXISTS "Wardrobe managers and admins can manage orders" ON gw_wardrobe_orders;
DROP POLICY IF EXISTS "Wardrobe managers and admins can manage member profiles" ON gw_member_wardrobe_profiles;

-- Create new inclusive policies for all executive board members
CREATE POLICY "Executive board and admins can manage inventory" 
ON gw_wardrobe_inventory 
FOR ALL 
TO authenticated
USING (
  is_current_user_admin_or_super_admin() OR 
  EXISTS (
    SELECT 1 FROM gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
)
WITH CHECK (
  is_current_user_admin_or_super_admin() OR 
  EXISTS (
    SELECT 1 FROM gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Executive board and admins can manage checkouts" 
ON gw_wardrobe_checkouts 
FOR ALL 
TO authenticated
USING (
  is_current_user_admin_or_super_admin() OR 
  EXISTS (
    SELECT 1 FROM gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
)
WITH CHECK (
  is_current_user_admin_or_super_admin() OR 
  EXISTS (
    SELECT 1 FROM gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Executive board and admins can manage announcements" 
ON gw_wardrobe_announcements 
FOR ALL 
TO authenticated
USING (
  is_current_user_admin_or_super_admin() OR 
  EXISTS (
    SELECT 1 FROM gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
)
WITH CHECK (
  is_current_user_admin_or_super_admin() OR 
  EXISTS (
    SELECT 1 FROM gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Executive board and admins can manage files" 
ON gw_wardrobe_files 
FOR ALL 
TO authenticated
USING (
  is_current_user_admin_or_super_admin() OR 
  EXISTS (
    SELECT 1 FROM gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
)
WITH CHECK (
  is_current_user_admin_or_super_admin() OR 
  EXISTS (
    SELECT 1 FROM gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Executive board and admins can manage orders" 
ON gw_wardrobe_orders 
FOR ALL 
TO authenticated
USING (
  is_current_user_admin_or_super_admin() OR 
  EXISTS (
    SELECT 1 FROM gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
)
WITH CHECK (
  is_current_user_admin_or_super_admin() OR 
  EXISTS (
    SELECT 1 FROM gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Executive board and admins can manage member profiles" 
ON gw_member_wardrobe_profiles 
FOR ALL 
TO authenticated
USING (
  is_current_user_admin_or_super_admin() OR 
  EXISTS (
    SELECT 1 FROM gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
)
WITH CHECK (
  is_current_user_admin_or_super_admin() OR 
  EXISTS (
    SELECT 1 FROM gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);