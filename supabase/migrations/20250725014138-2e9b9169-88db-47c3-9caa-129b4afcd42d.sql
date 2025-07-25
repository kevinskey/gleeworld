-- Allow users to delete their own excuse requests and admins to delete any
DROP POLICY IF EXISTS "Users can delete their own excuse requests" ON excuse_requests;
DROP POLICY IF EXISTS "Admins can delete any excuse requests" ON excuse_requests;

CREATE POLICY "Users can delete their own excuse requests" 
ON excuse_requests 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any excuse requests" 
ON excuse_requests 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);