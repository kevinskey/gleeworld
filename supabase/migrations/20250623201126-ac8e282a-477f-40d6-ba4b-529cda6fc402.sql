
-- Create policy to allow super-admins to delete any contract
CREATE POLICY "Super admins can delete any contract" 
ON public.contracts_v2 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'super-admin'
  )
);
