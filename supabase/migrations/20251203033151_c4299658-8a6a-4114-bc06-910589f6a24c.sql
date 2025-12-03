-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Group members can create polls" ON gw_polls;

-- Create a new policy that allows creating polls for messages you own
CREATE POLICY "Users can create polls for their messages" 
ON gw_polls 
FOR INSERT 
WITH CHECK (
  -- User must be authenticated and must have created the message
  auth.uid() IS NOT NULL
  AND message_id IN (
    SELECT id FROM gw_group_messages WHERE user_id = auth.uid()
  )
);

-- Also fix gw_poll_options policy to be less restrictive 
DROP POLICY IF EXISTS "Poll creators can insert options" ON gw_poll_options;

CREATE POLICY "Poll creators can insert options" 
ON gw_poll_options 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL
  AND poll_id IN (
    SELECT id FROM gw_polls WHERE created_by = auth.uid()
  )
);