-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admins can manage tour events" ON gw_tour_events;

-- Create new policy that includes exec board members
CREATE POLICY "Admins and exec can manage tour events" ON gw_tour_events
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.is_admin = true 
      OR p.is_super_admin = true 
      OR p.is_exec_board = true
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.is_admin = true 
      OR p.is_super_admin = true 
      OR p.is_exec_board = true
    )
  )
);