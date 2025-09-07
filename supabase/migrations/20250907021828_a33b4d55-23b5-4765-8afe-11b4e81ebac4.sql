-- Clean up existing policies to avoid conflicts

-- Remove all existing policies for the tables we're updating
DO $$ 
DECLARE 
    pol_name text;
BEGIN
    -- Drop all policies on gw_service_providers
    FOR pol_name IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'gw_service_providers'
    LOOP
        EXECUTE format('DROP POLICY %I ON public.gw_service_providers', pol_name);
    END LOOP;
    
    -- Drop all policies on gw_provider_availability
    FOR pol_name IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'gw_provider_availability'
    LOOP
        EXECUTE format('DROP POLICY %I ON public.gw_provider_availability', pol_name);
    END LOOP;
    
    -- Drop all policies on gw_provider_services
    FOR pol_name IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'gw_provider_services'
    LOOP
        EXECUTE format('DROP POLICY %I ON public.gw_provider_services', pol_name);
    END LOOP;
    
    -- Drop all policies on gw_appointments
    FOR pol_name IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'gw_appointments'
    LOOP
        EXECUTE format('DROP POLICY %I ON public.gw_appointments', pol_name);
    END LOOP;
END $$;

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

-- RLS policies for gw_service_providers
CREATE POLICY "provider_select_own_or_admin_all"
ON public.gw_service_providers
FOR SELECT
USING (
  is_current_user_admin_or_provider(user_id)
);

CREATE POLICY "provider_update_own_or_admin_all"
ON public.gw_service_providers
FOR UPDATE
USING (
  is_current_user_admin_or_provider(user_id)
);

CREATE POLICY "admin_can_insert_providers"
ON public.gw_service_providers
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "admin_can_delete_providers"
ON public.gw_service_providers
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- RLS policies for gw_provider_availability
CREATE POLICY "availability_select_control"
ON public.gw_provider_availability
FOR SELECT
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
  -- Anyone can view availability for booking purposes
  true
);

CREATE POLICY "availability_modify_control"
ON public.gw_provider_availability
FOR ALL
USING (
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

-- RLS policies for gw_provider_services
CREATE POLICY "provider_services_select"
ON public.gw_provider_services
FOR SELECT
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
);

CREATE POLICY "provider_services_modify"
ON public.gw_provider_services
FOR ALL
USING (
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

-- RLS policies for gw_appointments
CREATE POLICY "appointments_select_control"
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
  -- Users can see appointments assigned to them
  assigned_to = auth.uid()
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

CREATE POLICY "appointments_insert_control"
ON public.gw_appointments
FOR INSERT
WITH CHECK (
  -- Anyone can create appointments (for booking)
  true
);

CREATE POLICY "appointments_update_control"
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
  -- Users can update appointments assigned to them
  assigned_to = auth.uid()
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

CREATE POLICY "appointments_delete_control"
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