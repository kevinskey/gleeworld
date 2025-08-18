-- First, let's check if gw_module_permissions table exists and create it if needed
CREATE TABLE IF NOT EXISTS public.gw_module_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.gw_modules(id) ON DELETE CASCADE,
  permission_type TEXT NOT NULL CHECK (permission_type IN ('view', 'manage')),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  granted_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gw_module_permissions_user_id ON public.gw_module_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_gw_module_permissions_module_id ON public.gw_module_permissions(module_id);
CREATE INDEX IF NOT EXISTS idx_gw_module_permissions_active ON public.gw_module_permissions(is_active);

-- Create unique constraint to prevent duplicate permissions
CREATE UNIQUE INDEX IF NOT EXISTS idx_gw_module_permissions_unique 
ON public.gw_module_permissions(user_id, module_id) 
WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.gw_module_permissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can manage all module permissions" 
ON public.gw_module_permissions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Users can view their own module permissions" 
ON public.gw_module_permissions 
FOR SELECT 
USING (user_id = auth.uid());

-- Update trigger for timestamps
CREATE OR REPLACE FUNCTION public.update_gw_module_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gw_module_permissions_updated_at
  BEFORE UPDATE ON public.gw_module_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gw_module_permissions_updated_at();