-- Add INSERT policy for gw_poll_votes allowing users to vote
CREATE POLICY "Users can insert their own votes"
ON gw_poll_votes
FOR INSERT
WITH CHECK (auth.uid() = user_id);