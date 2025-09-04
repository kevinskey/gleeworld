-- Add UPDATE and DELETE policies for payment plans
-- Allow Rayne and super admins to edit payment plans
CREATE POLICY "Rayne and super admins can update payment plans" 
ON public.gw_dues_payment_plans 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (
      is_super_admin = true 
      OR email = 'raynestewart@spelman.edu'
    )
  )
);

-- Allow Rayne and super admins to delete payment plans
CREATE POLICY "Rayne and super admins can delete payment plans" 
ON public.gw_dues_payment_plans 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (
      is_super_admin = true 
      OR email = 'raynestewart@spelman.edu'
    )
  )
);

-- Also add UPDATE and DELETE policies for payment plan installments
CREATE POLICY "Rayne and super admins can update installments" 
ON public.gw_payment_plan_installments 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (
      is_super_admin = true 
      OR email = 'raynestewart@spelman.edu'
    )
  )
);

CREATE POLICY "Rayne and super admins can delete installments" 
ON public.gw_payment_plan_installments 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (
      is_super_admin = true 
      OR email = 'raynestewart@spelman.edu'
    )
  )
);