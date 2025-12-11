-- Drop the conflicting old policy
DROP POLICY IF EXISTS "Users can create invites" ON gw_live_session_invites;

-- Also fix SELECT and UPDATE policies to work for authenticated users
DROP POLICY IF EXISTS "Users can view their own invites" ON gw_live_session_invites;
DROP POLICY IF EXISTS "Users can update their invites" ON gw_live_session_invites;
DROP POLICY IF EXISTS "Hosts can delete their invites" ON gw_live_session_invites;

CREATE POLICY "Users can view their own invites"
ON gw_live_session_invites FOR SELECT
TO authenticated
USING (auth.uid() = invited_user_id OR auth.uid() = session_host_id);

CREATE POLICY "Users can update their invites"
ON gw_live_session_invites FOR UPDATE
TO authenticated
USING (auth.uid() = invited_user_id);

CREATE POLICY "Hosts can delete their invites"
ON gw_live_session_invites FOR DELETE
TO authenticated
USING (auth.uid() = session_host_id);