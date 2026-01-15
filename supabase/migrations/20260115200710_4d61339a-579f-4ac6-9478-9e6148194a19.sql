-- Add DELETE policy for gw_booking_requests table
-- Admins and Tour Managers should be able to delete booking requests

CREATE POLICY "Admins and Tour Managers can delete booking requests"
ON public.gw_booking_requests
FOR DELETE
USING (is_current_user_admin_or_super_admin() OR is_current_user_tour_manager());