-- Create the gw_user_module_permissions table
CREATE TABLE public.gw_user_module_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  module_id TEXT NOT NULL,
  granted_by UUID NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_user_module_permissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can manage all user module permissions" 
ON public.gw_user_module_permissions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Users can view their own module permissions" 
ON public.gw_user_module_permissions 
FOR SELECT 
USING (user_id = auth.uid());

-- Create index for better performance
CREATE INDEX idx_gw_user_module_permissions_user_id ON public.gw_user_module_permissions(user_id);
CREATE INDEX idx_gw_user_module_permissions_module_id ON public.gw_user_module_permissions(module_id);
CREATE INDEX idx_gw_user_module_permissions_active ON public.gw_user_module_permissions(is_active);

-- Create unique constraint to prevent duplicate active permissions
CREATE UNIQUE INDEX idx_gw_user_module_permissions_unique_active 
ON public.gw_user_module_permissions(user_id, module_id) 
WHERE is_active = true;