-- Fix the RLS policies for booking requests and executive board members
DROP POLICY IF EXISTS "Admins and Tour Managers can view all booking requests" ON gw_booking_requests;
DROP POLICY IF EXISTS "Admins and Tour Managers can update booking requests" ON gw_booking_requests;

-- Recreate booking request policies
CREATE POLICY "Admins and Tour Managers can view all booking requests" 
ON gw_booking_requests 
FOR SELECT 
USING (
  public.is_current_user_admin_or_super_admin() 
  OR public.is_current_user_tour_manager()
);

CREATE POLICY "Admins and Tour Managers can update booking requests" 
ON gw_booking_requests 
FOR UPDATE 
USING (
  public.is_current_user_admin_or_super_admin() 
  OR public.is_current_user_tour_manager()
);

-- Fix executive board policies to prevent recursion
DROP POLICY IF EXISTS "Users can view their own executive board membership" ON gw_executive_board_members;
DROP POLICY IF EXISTS "Admins can manage executive board members" ON gw_executive_board_members;
DROP POLICY IF EXISTS "Executive board members can view other members" ON gw_executive_board_members;

CREATE POLICY "Users can view their own executive board membership" 
ON gw_executive_board_members 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage executive board members" 
ON gw_executive_board_members 
FOR ALL 
USING (public.is_current_user_admin_or_super_admin());

CREATE POLICY "Executive board members can view other members" 
ON gw_executive_board_members 
FOR SELECT 
USING (
  public.is_current_user_admin_or_super_admin() 
  OR user_id = auth.uid()
);