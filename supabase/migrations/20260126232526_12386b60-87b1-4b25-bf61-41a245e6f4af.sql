-- Fix RLS policy for gw_attendance_records INSERT
-- The current policy incorrectly compares student_profile_id to auth.uid()
-- But student_profile_id stores gw_profiles.id, not user_id

-- Drop the existing incorrect policy
DROP POLICY IF EXISTS "Students can insert their own attendance via QR/PIN" ON gw_attendance_records;

-- Create corrected policy that properly looks up the profile ID
CREATE POLICY "Students can insert their own attendance via QR/PIN"
ON gw_attendance_records
FOR INSERT
TO public
WITH CHECK (
  -- Match student_profile_id to the user's profile record
  student_profile_id = (SELECT id FROM gw_profiles WHERE user_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM gw_attendance_sessions s
    WHERE s.id = gw_attendance_records.attendance_session_id
    AND s.status = 'open'
    AND now() >= s.opens_at
    AND now() <= s.closes_at
  )
);

-- Also fix the SELECT policy for viewing own records
DROP POLICY IF EXISTS "Students can view their own attendance records" ON gw_attendance_records;

CREATE POLICY "Students can view their own attendance records"
ON gw_attendance_records
FOR SELECT
TO public
USING (
  student_profile_id = (SELECT id FROM gw_profiles WHERE user_id = auth.uid())
);