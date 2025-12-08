-- Drop existing INSERT policy and recreate with clearer permissions
DROP POLICY IF EXISTS "Users can create their own exit interviews" ON member_exit_interviews;

-- Create clearer insert policy for authenticated users
CREATE POLICY "Authenticated users can submit their own exit interviews"
ON member_exit_interviews
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Do the same for exec_board_interviews
DROP POLICY IF EXISTS "Users can create own interviews" ON exec_board_interviews;

CREATE POLICY "Authenticated users can submit their own exec interviews"
ON exec_board_interviews
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);