-- Update RLS policy to allow event creators and tour managers to generate QR codes
DROP POLICY IF EXISTS "Admins and secretaries can manage QR codes" ON public.gw_attendance_qr_codes;

CREATE POLICY "Authorized users can manage QR codes"
ON public.gw_attendance_qr_codes
FOR ALL
TO public
USING (
  -- Admins, super-admins, and secretaries can manage all QR codes
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE gw_profiles.user_id = auth.uid() 
    AND (
      gw_profiles.is_admin = true 
      OR gw_profiles.is_super_admin = true 
      OR gw_profiles.role = ANY(ARRAY['admin', 'super-admin', 'secretary'])
    )
  )
  OR
  -- Event creators can manage QR codes for their events
  EXISTS (
    SELECT 1 FROM public.gw_events
    WHERE gw_events.id = gw_attendance_qr_codes.event_id
    AND gw_events.created_by = auth.uid()
  )
  OR
  -- Tour managers can manage QR codes
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members
    WHERE gw_executive_board_members.user_id = auth.uid()
    AND gw_executive_board_members.position = 'tour_manager'
    AND gw_executive_board_members.is_active = true
  )
)
WITH CHECK (
  -- Same conditions for INSERT
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE gw_profiles.user_id = auth.uid() 
    AND (
      gw_profiles.is_admin = true 
      OR gw_profiles.is_super_admin = true 
      OR gw_profiles.role = ANY(ARRAY['admin', 'super-admin', 'secretary'])
    )
  )
  OR
  EXISTS (
    SELECT 1 FROM public.gw_events
    WHERE gw_events.id = gw_attendance_qr_codes.event_id
    AND gw_events.created_by = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members
    WHERE gw_executive_board_members.user_id = auth.uid()
    AND gw_executive_board_members.position = 'tour_manager'
    AND gw_executive_board_members.is_active = true
  )
);