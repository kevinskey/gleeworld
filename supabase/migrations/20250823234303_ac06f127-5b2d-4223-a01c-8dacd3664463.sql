-- Update the DELETE policy for buckets of love to allow any authenticated user to delete any bucket
DROP POLICY IF EXISTS "Users can delete their own buckets" ON public.gw_buckets_of_love;
DROP POLICY IF EXISTS "Users can delete their own love messages" ON public.gw_buckets_of_love;

-- Create new policy allowing any authenticated user to delete any bucket
CREATE POLICY "Authenticated users can delete any bucket" 
ON public.gw_buckets_of_love 
FOR DELETE 
TO authenticated 
USING (auth.uid() IS NOT NULL);