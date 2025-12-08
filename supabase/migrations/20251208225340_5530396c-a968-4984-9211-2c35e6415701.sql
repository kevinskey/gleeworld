-- Fix infinite recursion in gw_communication_system policies
DROP POLICY IF EXISTS "Users can update their own communications" ON public.gw_communication_system;
DROP POLICY IF EXISTS "Users can view communications sent to them" ON public.gw_communication_system;

CREATE POLICY "Users can update their own communications" 
ON public.gw_communication_system 
FOR UPDATE 
TO authenticated
USING (auth.uid() = sender_id OR is_gw_admin_v2());

CREATE POLICY "Users can view communications sent to them" 
ON public.gw_communication_system 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = sender_id 
  OR is_gw_admin_v2()
  OR EXISTS (
    SELECT 1 FROM gw_communication_recipients gcr
    WHERE gcr.communication_id = gw_communication_system.id 
    AND (gcr.recipient_identifier = auth.uid()::text OR gcr.recipient_type = 'all_members')
  )
);

-- Fix infinite recursion in gw_communication_recipients policies
DROP POLICY IF EXISTS "Users can view recipient lists for their communications" ON public.gw_communication_recipients;

CREATE POLICY "Users can view recipient lists for their communications" 
ON public.gw_communication_recipients 
FOR SELECT 
TO authenticated
USING (
  is_gw_admin_v2()
  OR EXISTS (
    SELECT 1 FROM gw_communication_system gcs
    WHERE gcs.id = gw_communication_recipients.communication_id 
    AND gcs.sender_id = auth.uid()
  )
);

-- Fix infinite recursion in gw_recording_shares policies
DROP POLICY IF EXISTS "Recording owners can manage shares" ON public.gw_recording_shares;

CREATE POLICY "Recording owners can manage shares" 
ON public.gw_recording_shares 
FOR ALL 
TO authenticated
USING (
  shared_by = auth.uid() 
  OR is_gw_admin_v2()
  OR EXISTS (
    SELECT 1 FROM gw_recordings r
    WHERE r.id = gw_recording_shares.recording_id AND r.recorded_by = auth.uid()
  )
)
WITH CHECK (
  shared_by = auth.uid() 
  OR is_gw_admin_v2()
  OR EXISTS (
    SELECT 1 FROM gw_recordings r
    WHERE r.id = gw_recording_shares.recording_id AND r.recorded_by = auth.uid()
  )
);

-- Fix gw_recordings policies to not cause recursion with gw_recording_shares
DROP POLICY IF EXISTS "Users can view recordings shared with them" ON public.gw_recordings;

CREATE POLICY "Users can view recordings shared with them" 
ON public.gw_recordings 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = recorded_by 
  OR is_gw_admin_v2()
);

-- Add a separate simpler policy for shared recordings
CREATE POLICY "Users can view shared recordings" 
ON public.gw_recordings 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM gw_recording_shares rs
    WHERE rs.recording_id = gw_recordings.id AND rs.shared_with = auth.uid()
  )
);