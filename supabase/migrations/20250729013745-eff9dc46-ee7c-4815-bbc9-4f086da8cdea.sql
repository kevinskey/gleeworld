-- Fix the tour manager function with proper type casting
CREATE OR REPLACE FUNCTION public.is_current_user_tour_manager()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND position::text = 'tour_manager'
    AND is_active = true
  );
$$;

-- Recreate the booking request policies
DROP POLICY IF EXISTS "Admins and Tour Managers can view all booking requests" ON gw_booking_requests;
DROP POLICY IF EXISTS "Admins and Tour Managers can update booking requests" ON gw_booking_requests;

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