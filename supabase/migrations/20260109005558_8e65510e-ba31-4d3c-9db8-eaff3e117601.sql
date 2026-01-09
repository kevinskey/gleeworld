-- Drop existing policy
DROP POLICY IF EXISTS "Authorized users can manage QR codes" ON public.gw_attendance_qr_codes;

-- Create updated policy that includes all exec board members
CREATE POLICY "Authorized users can manage QR codes"
ON public.gw_attendance_qr_codes
FOR ALL
TO public
USING (
  -- Admins and super-admins can manage all QR codes
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE gw_profiles.user_id = auth.uid() 
    AND (
      gw_profiles.is_admin = true 
      OR gw_profiles.is_super_admin = true 
      OR gw_profiles.role = ANY(ARRAY['admin', 'super-admin'])
    )
  )
  OR
  -- All exec board members can manage QR codes
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members
    WHERE gw_executive_board_members.user_id = auth.uid()
    AND gw_executive_board_members.is_active = true
  )
  OR
  -- Event creators can manage QR codes for their events
  EXISTS (
    SELECT 1 FROM public.gw_events
    WHERE gw_events.id = gw_attendance_qr_codes.event_id
    AND gw_events.created_by = auth.uid()
  )
)
WITH CHECK (
  -- Same conditions for INSERT/UPDATE
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE gw_profiles.user_id = auth.uid() 
    AND (
      gw_profiles.is_admin = true 
      OR gw_profiles.is_super_admin = true 
      OR gw_profiles.role = ANY(ARRAY['admin', 'super-admin'])
    )
  )
  OR
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members
    WHERE gw_executive_board_members.user_id = auth.uid()
    AND gw_executive_board_members.is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.gw_events
    WHERE gw_events.id = gw_attendance_qr_codes.event_id
    AND gw_events.created_by = auth.uid()
  )
);