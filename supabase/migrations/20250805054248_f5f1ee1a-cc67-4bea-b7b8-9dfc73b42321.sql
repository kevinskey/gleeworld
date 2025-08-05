-- Add DELETE policy for admins on reimbursement requests
CREATE POLICY "Admins and super admins can delete reimbursement requests"
ON public.gw_reimbursement_requests
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);