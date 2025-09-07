-- Create RLS policies for gw_service_providers table

-- Allow everyone to view active service providers
CREATE POLICY "Anyone can view active service providers" 
ON public.gw_service_providers 
FOR SELECT 
USING (is_active = true);

-- Allow service providers to view and update their own profile
CREATE POLICY "Service providers can view their own profile" 
ON public.gw_service_providers 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Service providers can update their own profile" 
ON public.gw_service_providers 
FOR UPDATE 
USING (user_id = auth.uid());

-- Allow admins to manage all service providers
CREATE POLICY "Admins can manage all service providers" 
ON public.gw_service_providers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Allow authenticated users to create service provider profiles
CREATE POLICY "Users can create service provider profiles" 
ON public.gw_service_providers 
FOR INSERT 
WITH CHECK (user_id = auth.uid());