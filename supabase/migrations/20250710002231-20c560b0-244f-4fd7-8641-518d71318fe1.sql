-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can manage all events" ON gw_events;

-- Recreate the admin policy using the existing security definer function
CREATE POLICY "Admins can manage all events" 
ON gw_events 
FOR ALL 
TO authenticated 
USING (
  is_admin(auth.uid()) OR is_super_admin(auth.uid())
);