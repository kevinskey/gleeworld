-- Update RLS policies for gw_booking_requests to allow better admin access

-- Drop existing policies
DROP POLICY IF EXISTS "Admins and Tour Managers can view all booking requests" ON gw_booking_requests;
DROP POLICY IF EXISTS "Admins and Tour Managers can update booking requests" ON gw_booking_requests;

-- Recreate policies with better logic
CREATE POLICY "Admins and Tour Managers can view all booking requests" 
ON gw_booking_requests 
FOR SELECT 
USING (
  -- Allow admins and super-admins from gw_profiles
  (EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE gw_profiles.user_id = auth.uid() 
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  ))
  OR
  -- Allow active tour managers from executive board
  (EXISTS (
    SELECT 1 FROM gw_executive_board_members 
    WHERE gw_executive_board_members.user_id = auth.uid() 
    AND gw_executive_board_members.position = 'tour_manager'::executive_position 
    AND gw_executive_board_members.is_active = true
  ))
);

CREATE POLICY "Admins and Tour Managers can update booking requests" 
ON gw_booking_requests 
FOR UPDATE 
USING (
  -- Allow admins and super-admins from gw_profiles
  (EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE gw_profiles.user_id = auth.uid() 
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  ))
  OR
  -- Allow active tour managers from executive board
  (EXISTS (
    SELECT 1 FROM gw_executive_board_members 
    WHERE gw_executive_board_members.user_id = auth.uid() 
    AND gw_executive_board_members.position = 'tour_manager'::executive_position 
    AND gw_executive_board_members.is_active = true
  ))
);