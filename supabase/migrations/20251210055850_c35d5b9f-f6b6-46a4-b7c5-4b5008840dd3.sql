-- Allow authenticated users to create direct message groups
CREATE POLICY "Users can create direct message groups"
ON public.gw_message_groups
FOR INSERT
TO authenticated
WITH CHECK (
  group_type = 'direct' AND 
  created_by = auth.uid()
);