-- Fix RLS recursion issue in gw_recordings policies
DROP POLICY IF EXISTS "Users can view recordings shared with them" ON gw_recordings;

CREATE POLICY "Users can view recordings shared with them" ON gw_recordings
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM gw_recording_shares rs
    WHERE rs.recording_id = gw_recordings.id 
    AND rs.shared_with = auth.uid()
  )
);