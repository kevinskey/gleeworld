-- Drop and recreate the INSERT policy with proper TO clause
DROP POLICY IF EXISTS "Users can send invites" ON gw_live_session_invites;

CREATE POLICY "Users can send invites"
ON gw_live_session_invites FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = session_host_id);