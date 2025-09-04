-- Add INSERT policy for users to create installments for their own payment plans
CREATE POLICY "Users can create installments for their payment plans" 
ON public.gw_payment_plan_installments 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.gw_dues_payment_plans 
    WHERE gw_dues_payment_plans.id = gw_payment_plan_installments.payment_plan_id 
    AND gw_dues_payment_plans.user_id = auth.uid()
  )
);