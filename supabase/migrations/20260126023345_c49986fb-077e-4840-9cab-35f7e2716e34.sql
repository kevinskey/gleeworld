-- Allow instructors/admins to update ANY discussion, not just their own
CREATE POLICY "Instructors and admins can update any discussion"
ON course_discussions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.is_admin = true 
      OR p.is_super_admin = true 
      OR p.is_exec_board = true
      OR p.role IN ('admin', 'super_admin', 'instructor')
    )
  )
);