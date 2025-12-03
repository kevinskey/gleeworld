-- Fix SELECT policy on gw_polls to allow creators and admins to view
DROP POLICY IF EXISTS "Users can view polls in groups they belong to" ON gw_polls;

CREATE POLICY "Users can view polls in groups they belong to" 
ON gw_polls 
FOR SELECT 
USING (
  -- Creator can always see their polls
  created_by = auth.uid()
  OR
  -- Group members can see polls
  message_id IN (
    SELECT gm.id
    FROM gw_group_messages gm
    JOIN gw_group_members gmem ON gmem.group_id = gm.group_id
    WHERE gmem.user_id = auth.uid()
  )
  OR
  -- Admins can see all polls
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Fix SELECT policy on gw_poll_options
DROP POLICY IF EXISTS "Users can view poll options for accessible polls" ON gw_poll_options;

CREATE POLICY "Users can view poll options for accessible polls" 
ON gw_poll_options 
FOR SELECT 
USING (
  poll_id IN (
    SELECT id FROM gw_polls WHERE 
      created_by = auth.uid()
      OR message_id IN (
        SELECT gm.id
        FROM gw_group_messages gm
        JOIN gw_group_members gmem ON gmem.group_id = gm.group_id
        WHERE gmem.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM gw_profiles 
        WHERE user_id = auth.uid() 
        AND (is_admin = true OR is_super_admin = true)
      )
  )
);

-- Fix SELECT policy on gw_poll_votes
DROP POLICY IF EXISTS "Users can view votes for accessible polls" ON gw_poll_votes;

CREATE POLICY "Users can view votes for accessible polls" 
ON gw_poll_votes 
FOR SELECT 
USING (
  poll_id IN (
    SELECT id FROM gw_polls WHERE 
      created_by = auth.uid()
      OR message_id IN (
        SELECT gm.id
        FROM gw_group_messages gm
        JOIN gw_group_members gmem ON gmem.group_id = gm.group_id
        WHERE gmem.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM gw_profiles 
        WHERE user_id = auth.uid() 
        AND (is_admin = true OR is_super_admin = true)
      )
  )
);