-- Create function to check if user is wardrobe manager
CREATE OR REPLACE FUNCTION public.is_wardrobe_manager(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = user_id_param 
    AND (is_admin = true OR is_super_admin = true OR exec_board_role = 'wardrobe_manager')
  );
$$;

-- Drop existing appointment policies to recreate with wardrobe manager access
DROP POLICY IF EXISTS "appointments_select_control" ON public.gw_appointments;
DROP POLICY IF EXISTS "appointments_insert_control" ON public.gw_appointments;
DROP POLICY IF EXISTS "appointments_update_control" ON public.gw_appointments;
DROP POLICY IF EXISTS "appointments_delete_control" ON public.gw_appointments;

-- Recreate appointment policies with wardrobe manager access
CREATE POLICY "appointments_select_control" 
ON public.gw_appointments 
FOR SELECT 
USING (
  -- Admins and super admins can see all
  (EXISTS (SELECT 1 FROM public.gw_profiles WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)))
  OR 
  -- Wardrobe managers can see all appointments
  (public.is_wardrobe_manager(auth.uid()))
  OR
  -- Users can see appointments they created
  (created_by = auth.uid()) 
  OR 
  -- Users can see appointments assigned to them
  (assigned_to = auth.uid()) 
  OR 
  -- Providers can see their own appointments
  (provider_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.gw_service_providers sp 
    WHERE sp.id = gw_appointments.provider_id AND sp.user_id = auth.uid()
  ))
);

CREATE POLICY "appointments_insert_control" 
ON public.gw_appointments 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "appointments_update_control" 
ON public.gw_appointments 
FOR UPDATE 
USING (
  -- Admins and super admins can update all
  (EXISTS (SELECT 1 FROM public.gw_profiles WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)))
  OR 
  -- Wardrobe managers can update all appointments
  (public.is_wardrobe_manager(auth.uid()))
  OR
  -- Users can update appointments they created
  (created_by = auth.uid()) 
  OR 
  -- Users can update appointments assigned to them
  (assigned_to = auth.uid()) 
  OR 
  -- Providers can update their own appointments
  (provider_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.gw_service_providers sp 
    WHERE sp.id = gw_appointments.provider_id AND sp.user_id = auth.uid()
  ))
);

CREATE POLICY "appointments_delete_control" 
ON public.gw_appointments 
FOR DELETE 
USING (
  -- Admins and super admins can delete all
  (EXISTS (SELECT 1 FROM public.gw_profiles WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)))
  OR 
  -- Wardrobe managers can delete all appointments
  (public.is_wardrobe_manager(auth.uid()))
  OR
  -- Users can delete appointments they created
  (created_by = auth.uid()) 
  OR 
  -- Providers can delete their own appointments
  (provider_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.gw_service_providers sp 
    WHERE sp.id = gw_appointments.provider_id AND sp.user_id = auth.uid()
  ))
);