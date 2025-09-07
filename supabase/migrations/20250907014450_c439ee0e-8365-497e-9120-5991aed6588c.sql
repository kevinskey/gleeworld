-- Create a many-to-many relationship table between services and providers
CREATE TABLE public.gw_provider_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.gw_service_providers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.gw_services(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure a provider can't have duplicate services
  UNIQUE(provider_id, service_id)
);

-- Enable RLS
ALTER TABLE public.gw_provider_services ENABLE ROW LEVEL SECURITY;

-- RLS Policies for provider services
CREATE POLICY "Anyone can view active provider services"
ON public.gw_provider_services
FOR SELECT
USING (is_active = true);

CREATE POLICY "Providers can manage their own services"
ON public.gw_provider_services
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_service_providers sp
    WHERE sp.id = provider_id AND sp.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all provider services"
ON public.gw_provider_services
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_gw_provider_services_updated_at
  BEFORE UPDATE ON public.gw_provider_services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();