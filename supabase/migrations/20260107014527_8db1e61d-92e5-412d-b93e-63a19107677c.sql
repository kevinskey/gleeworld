-- Drop the restrictive insert policy
DROP POLICY IF EXISTS "Admins and tour managers can manage milestones" ON tour_milestones;

-- Create separate policies for better control
CREATE POLICY "Authenticated users can insert milestones"
ON tour_milestones FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update milestones"
ON tour_milestones FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete milestones"
ON tour_milestones FOR DELETE
TO authenticated
USING (true);