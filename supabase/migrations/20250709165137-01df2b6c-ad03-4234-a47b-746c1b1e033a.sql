-- Add missing DELETE policy for user_payments table
CREATE POLICY "Admins can delete payments" 
ON public.user_payments 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = ANY(ARRAY['admin', 'super-admin'])
  )
);