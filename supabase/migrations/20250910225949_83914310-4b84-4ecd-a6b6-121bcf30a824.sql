-- Check current RLS policies on gw_appointments table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'gw_appointments';

-- Add RLS policies for appointment booking
CREATE POLICY "Anyone can create appointments" ON public.gw_appointments
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can view appointments they created" ON public.gw_appointments
  FOR SELECT 
  USING (client_email = get_current_user_email() OR created_by = auth.uid());

CREATE POLICY "Admins can manage all appointments" ON public.gw_appointments
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

CREATE POLICY "Providers can view their appointments" ON public.gw_appointments
  FOR SELECT 
  USING (
    provider_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.gw_service_providers sp 
      WHERE sp.user_id = auth.uid() AND sp.id = gw_appointments.provider_id
    )
  );