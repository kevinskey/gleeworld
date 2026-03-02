
-- Drop the restrictive student SELECT policy
DROP POLICY IF EXISTS "Users can view confirmed tours they're participating in" ON gw_tours;

-- Create a new policy that allows all authenticated users to view active/planning/confirmed tours
CREATE POLICY "Authenticated users can view active tours"
ON gw_tours
FOR SELECT
TO authenticated
USING (status IN ('planning', 'confirmed', 'active'));
