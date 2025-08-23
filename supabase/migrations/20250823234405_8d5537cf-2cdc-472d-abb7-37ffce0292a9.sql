-- Update the DELETE policy for buckets of love to only allow super admins to delete any bucket
DROP POLICY IF EXISTS "Authenticated users can delete any bucket" ON public.gw_buckets_of_love;

-- Create new policy allowing only super admins to delete any bucket
CREATE POLICY "Only super admins can delete any bucket" 
ON public.gw_buckets_of_love 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND is_super_admin = true
  )
);