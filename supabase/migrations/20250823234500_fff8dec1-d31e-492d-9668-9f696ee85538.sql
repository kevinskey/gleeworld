-- Update the DELETE policy for buckets of love to allow super admins to delete any bucket AND members to delete their own buckets
DROP POLICY IF EXISTS "Only super admins can delete any bucket" ON public.gw_buckets_of_love;

-- Create new policy allowing super admins to delete any bucket OR users to delete their own buckets
CREATE POLICY "Super admins can delete any bucket, members can delete their own" 
ON public.gw_buckets_of_love 
FOR DELETE 
TO authenticated 
USING (
  -- Super admins can delete any bucket
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND is_super_admin = true
  )
  OR
  -- Users can delete their own buckets
  auth.uid() = user_id
);