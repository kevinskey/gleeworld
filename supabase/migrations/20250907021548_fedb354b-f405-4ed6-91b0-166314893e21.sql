-- Create security definer functions for role checking
CREATE OR REPLACE FUNCTION public.is_current_user_provider(provider_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() = provider_user_id;
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_admin_or_provider(provider_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    -- Check if user is admin/super admin
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
    OR 
    -- Check if user is the provider
    auth.uid() = provider_user_id
  );
$$;

-- Update RLS policies for gw_service_providers table
DROP POLICY IF EXISTS "Providers can view their own profile" ON public.gw_service_providers;
DROP POLICY IF EXISTS "Providers can update their own profile" ON public.gw_service_providers;
DROP POLICY IF EXISTS "Admins can view all providers" ON public.gw_service_providers;
DROP POLICY IF EXISTS "Admins can manage all providers" ON public.gw_service_providers;

-- Create new comprehensive policies for gw_service_providers
CREATE POLICY "Providers can view their own profile and admins can view all"
ON public.gw_service_providers
FOR SELECT
USING (
  is_current_user_admin_or_provider(user_id)
);

CREATE POLICY "Providers can update their own profile and admins can update all"
ON public.gw_service_providers
FOR UPDATE
USING (
  is_current_user_admin_or_provider(user_id)
);

CREATE POLICY "Admins can insert providers"
ON public.gw_service_providers
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Admins can delete providers"
ON public.gw_service_providers
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Update RLS policies for gw_provider_availability
DROP POLICY IF EXISTS "Providers can manage their own availability" ON public.gw_provider_availability;
DROP POLICY IF EXISTS "Anyone can view provider availability" ON public.gw_provider_availability;

CREATE POLICY "Provider availability access control"
ON public.gw_provider_availability
FOR ALL
USING (
  -- Admins can see all
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
  OR
  -- Providers can see their own
  EXISTS (
    SELECT 1 FROM public.gw_service_providers sp
    WHERE sp.id = gw_provider_availability.provider_id
    AND sp.user_id = auth.uid()
  )
  OR
  -- Anyone can view availability for booking purposes (read-only)
  (
    SELECT current_setting('request.method', true) = 'GET'
  )
)
WITH CHECK (
  -- Only admins and the provider themselves can modify
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
  OR
  EXISTS (
    SELECT 1 FROM public.gw_service_providers sp
    WHERE sp.id = gw_provider_availability.provider_id
    AND sp.user_id = auth.uid()
  )
);

-- Update RLS policies for gw_provider_services
DROP POLICY IF EXISTS "Provider service associations are viewable" ON public.gw_provider_services;
DROP POLICY IF EXISTS "Admins can manage provider services" ON public.gw_provider_services;

CREATE POLICY "Provider services access control"
ON public.gw_provider_services
FOR ALL
USING (
  -- Admins can see all
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
  OR
  -- Providers can see their own
  EXISTS (
    SELECT 1 FROM public.gw_service_providers sp
    WHERE sp.id = gw_provider_services.provider_id
    AND sp.user_id = auth.uid()
  )
  OR
  -- Anyone can view for booking purposes
  true
)
WITH CHECK (
  -- Only admins and the provider themselves can modify
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
  OR
  EXISTS (
    SELECT 1 FROM public.gw_service_providers sp
    WHERE sp.id = gw_provider_services.provider_id
    AND sp.user_id = auth.uid()
  )
);

-- Update RLS policies for gw_appointments to include provider access
DROP POLICY IF EXISTS "Users can view their own appointments" ON public.gw_appointments;
DROP POLICY IF EXISTS "Users can create appointments" ON public.gw_appointments;
DROP POLICY IF EXISTS "Users can update their own appointments" ON public.gw_appointments;
DROP POLICY IF EXISTS "Admins can manage all appointments" ON public.gw_appointments;

CREATE POLICY "Appointment access control"
ON public.gw_appointments
FOR SELECT
USING (
  -- Admins can see all
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
  OR
  -- Users can see appointments they created
  created_by = auth.uid()
  OR
  -- Providers can see appointments assigned to them
  (
    provider_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.gw_service_providers sp
      WHERE sp.id = gw_appointments.provider_id
      AND sp.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Appointment creation control"
ON public.gw_appointments
FOR INSERT
WITH CHECK (
  -- Anyone can create appointments (for booking)
  true
);

CREATE POLICY "Appointment update control"
ON public.gw_appointments
FOR UPDATE
USING (
  -- Admins can update all
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
  OR
  -- Users can update appointments they created
  created_by = auth.uid()
  OR
  -- Providers can update their own appointments
  (
    provider_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.gw_service_providers sp
      WHERE sp.id = gw_appointments.provider_id
      AND sp.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Appointment deletion control"
ON public.gw_appointments
FOR DELETE
USING (
  -- Admins can delete all
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
  OR
  -- Users can delete appointments they created
  created_by = auth.uid()
  OR
  -- Providers can delete their own appointments
  (
    provider_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.gw_service_providers sp
      WHERE sp.id = gw_appointments.provider_id
      AND sp.user_id = auth.uid()
    )
  )
);