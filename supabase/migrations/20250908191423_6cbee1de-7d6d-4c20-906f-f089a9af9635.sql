-- Fix RLS policies for gw_appointments to allow students to save appointments

-- First, ensure RLS is enabled
ALTER TABLE public.gw_appointments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them with proper checks
DROP POLICY IF EXISTS "appointments_insert_control" ON public.gw_appointments;
DROP POLICY IF EXISTS "appointments_select_control" ON public.gw_appointments;
DROP POLICY IF EXISTS "appointments_update_control" ON public.gw_appointments;
DROP POLICY IF EXISTS "appointments_delete_control" ON public.gw_appointments;

-- Allow authenticated users to create appointments
CREATE POLICY "appointments_insert_control" 
ON public.gw_appointments 
FOR INSERT 
TO public 
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    created_by = auth.uid() OR 
    created_by IS NULL
  )
);

-- Allow users to view appointments they created, are assigned to, or are the provider for
-- Also allow admins and wardrobe managers to view all
CREATE POLICY "appointments_select_control" 
ON public.gw_appointments 
FOR SELECT 
TO public 
USING (
  auth.uid() IS NOT NULL AND (
    -- Admins can see all appointments
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    ) OR
    -- Wardrobe managers can see all appointments
    public.is_wardrobe_manager(auth.uid()) OR
    -- Users can see appointments they created
    created_by = auth.uid() OR
    -- Users can see appointments assigned to them
    assigned_to = auth.uid() OR
    -- Service providers can see their appointments
    (provider_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.gw_service_providers sp
      WHERE sp.id = gw_appointments.provider_id 
      AND sp.user_id = auth.uid()
    )) OR
    -- Allow public viewing of certain appointment types (for booking)
    appointment_type = 'public_booking'
  )
);

-- Allow users to update appointments they created, are assigned to, or are the provider for
CREATE POLICY "appointments_update_control" 
ON public.gw_appointments 
FOR UPDATE 
TO public 
USING (
  auth.uid() IS NOT NULL AND (
    -- Admins can update all appointments
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    ) OR
    -- Wardrobe managers can update all appointments
    public.is_wardrobe_manager(auth.uid()) OR
    -- Users can update appointments they created
    created_by = auth.uid() OR
    -- Users can update appointments assigned to them
    assigned_to = auth.uid() OR
    -- Service providers can update their appointments
    (provider_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.gw_service_providers sp
      WHERE sp.id = gw_appointments.provider_id 
      AND sp.user_id = auth.uid()
    ))
  )
);

-- Allow users to delete appointments they created or admins/managers
CREATE POLICY "appointments_delete_control" 
ON public.gw_appointments 
FOR DELETE 
TO public 
USING (
  auth.uid() IS NOT NULL AND (
    -- Admins can delete all appointments
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    ) OR
    -- Wardrobe managers can delete all appointments
    public.is_wardrobe_manager(auth.uid()) OR
    -- Users can delete appointments they created
    created_by = auth.uid() OR
    -- Service providers can delete their appointments
    (provider_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.gw_service_providers sp
      WHERE sp.id = gw_appointments.provider_id 
      AND sp.user_id = auth.uid()
    ))
  )
);