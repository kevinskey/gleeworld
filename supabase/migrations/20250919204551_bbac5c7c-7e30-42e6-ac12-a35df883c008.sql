-- Add provider_id column to gw_appointments table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gw_appointments' 
    AND column_name = 'provider_id'
  ) THEN
    ALTER TABLE public.gw_appointments 
    ADD COLUMN provider_id UUID REFERENCES public.gw_service_providers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Update RLS policies for gw_appointments to ensure providers only see their own appointments
DROP POLICY IF EXISTS "Providers can view their own appointments" ON public.gw_appointments;
DROP POLICY IF EXISTS "Providers can manage their own appointments" ON public.gw_appointments;

-- Providers can only view their own appointments
CREATE POLICY "Providers can view their own appointments" 
ON public.gw_appointments 
FOR SELECT 
USING (
  provider_id IN (
    SELECT id FROM public.gw_service_providers 
    WHERE user_id = auth.uid()
  )
);

-- Providers can only create, update, delete their own appointments
CREATE POLICY "Providers can manage their own appointments" 
ON public.gw_appointments 
FOR ALL 
USING (
  provider_id IN (
    SELECT id FROM public.gw_service_providers 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  provider_id IN (
    SELECT id FROM public.gw_service_providers 
    WHERE user_id = auth.uid()
  )
);

-- Allow admins to manage all appointments
CREATE POLICY "Admins can manage all appointments" 
ON public.gw_appointments 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_gw_appointments_provider_id ON public.gw_appointments(provider_id);

-- Update existing appointments to link them to the first available provider for demo purposes
-- This is just for testing - in production, you'd handle this differently
UPDATE public.gw_appointments 
SET provider_id = (
  SELECT id FROM public.gw_service_providers 
  WHERE is_active = true 
  ORDER BY created_at 
  LIMIT 1
)
WHERE provider_id IS NULL;