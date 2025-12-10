-- Allow admins to create message groups
CREATE POLICY "Admins can create message groups"
ON public.gw_message_groups
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  )
);