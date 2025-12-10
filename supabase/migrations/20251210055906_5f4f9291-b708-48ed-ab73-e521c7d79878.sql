-- Allow users to add members to groups they created
CREATE POLICY "Users can add members to their direct message groups"
ON public.gw_group_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_message_groups
    WHERE gw_message_groups.id = group_id
    AND gw_message_groups.group_type = 'direct'
    AND gw_message_groups.created_by = auth.uid()
  )
);