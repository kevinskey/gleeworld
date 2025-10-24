
-- Add group_id column to link submissions to groups
ALTER TABLE group_updates_mus240 
ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES mus240_project_groups(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_group_updates_group_id ON group_updates_mus240(group_id);

-- Drop old policy
DROP POLICY IF EXISTS "Students can update their own submissions" ON group_updates_mus240;

-- Create new policy allowing group members to update
CREATE POLICY "Group members can update their group's submission"
ON group_updates_mus240
FOR UPDATE
TO public
USING (
  -- User is the submitter OR user is a member of the group that submitted
  auth.uid() = submitter_id 
  OR 
  EXISTS (
    SELECT 1 FROM mus240_group_memberships
    WHERE mus240_group_memberships.group_id = group_updates_mus240.group_id
    AND mus240_group_memberships.member_id = auth.uid()
  )
);

-- Also allow group members to delete their submissions
DROP POLICY IF EXISTS "Allow users to delete their own updates" ON group_updates_mus240;

CREATE POLICY "Group members can delete their group's submission"
ON group_updates_mus240
FOR DELETE
TO public
USING (
  -- User is the submitter OR user is a member of the group that submitted
  auth.uid() = submitter_id 
  OR 
  EXISTS (
    SELECT 1 FROM mus240_group_memberships
    WHERE mus240_group_memberships.group_id = group_updates_mus240.group_id
    AND mus240_group_memberships.member_id = auth.uid()
  )
);
