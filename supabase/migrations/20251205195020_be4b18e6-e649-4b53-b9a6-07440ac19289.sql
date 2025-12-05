-- Drop the existing public insert policy and replace with more specific policies
DROP POLICY IF EXISTS "Anyone can submit ticket requests" ON concert_ticket_requests;

-- Allow public/anonymous submissions (for the public form)
CREATE POLICY "Public can submit ticket requests"
ON concert_ticket_requests
FOR INSERT
TO public
WITH CHECK (true);

-- Allow exec board members to insert ticket recipients
CREATE POLICY "Exec board can add ticket recipients"
ON concert_ticket_requests
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_exec_board = true OR gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  )
);