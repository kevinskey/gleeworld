-- Add admin access policy for viewing all dues records
CREATE POLICY "Admins can view all dues records" ON public.gw_dues_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Add admin access policy for viewing all payment plans
CREATE POLICY "Admins can view all payment plans" ON public.gw_dues_payment_plans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Add admin access policy for viewing all reminders
CREATE POLICY "Admins can view all reminders" ON public.gw_dues_reminders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );