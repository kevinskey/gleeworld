-- Create RLS policies for dashboard data access

-- For user_dashboard_data view access (users can view their own data)
CREATE POLICY "Users can view their own dashboard data" 
ON public.gw_profiles
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- For user_payments (users can view their own payments)
CREATE POLICY "Users can view their own payments" 
ON public.user_payments
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Create RLS policies for gw_notifications (users can manage their own notifications)
CREATE POLICY "Users can view their own notifications" 
ON public.gw_notifications
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.gw_notifications
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" 
ON public.gw_notifications
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Allow admins to view all data for management purposes
CREATE POLICY "Admins can view all profiles" 
ON public.gw_profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles admin_profile 
    WHERE admin_profile.user_id = auth.uid() 
    AND (admin_profile.is_admin = true OR admin_profile.is_super_admin = true)
  )
);

CREATE POLICY "Admins can view all payments" 
ON public.user_payments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles admin_profile 
    WHERE admin_profile.user_id = auth.uid() 
    AND (admin_profile.is_admin = true OR admin_profile.is_super_admin = true)
  )
);

CREATE POLICY "Admins can manage all notifications" 
ON public.gw_notifications
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles admin_profile 
    WHERE admin_profile.user_id = auth.uid() 
    AND (admin_profile.is_admin = true OR admin_profile.is_super_admin = true)
  )
);