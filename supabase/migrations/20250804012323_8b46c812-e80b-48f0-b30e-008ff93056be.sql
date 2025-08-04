-- Create the module system tables first
CREATE TABLE public.gw_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  default_permissions JSONB DEFAULT '["view"]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.gw_module_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.gw_modules(id) ON DELETE CASCADE,
  permission_type TEXT NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  granted_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, module_id, permission_type)
);

-- Enable RLS
ALTER TABLE public.gw_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_module_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gw_modules
CREATE POLICY "Everyone can view active modules" ON public.gw_modules
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage modules" ON public.gw_modules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
    )
  );

-- RLS Policies for gw_module_permissions
CREATE POLICY "Users can view their own module permissions" ON public.gw_module_permissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all module permissions" ON public.gw_module_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Functions for module permissions
CREATE OR REPLACE FUNCTION public.user_has_module_permission(module_name_param TEXT, permission_type_param TEXT DEFAULT 'view')
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_module_permissions mp
    JOIN public.gw_modules m ON m.id = mp.module_id
    WHERE m.name = module_name_param 
    AND mp.user_id = auth.uid() 
    AND mp.permission_type = permission_type_param
    AND mp.is_active = true
    AND (mp.expires_at IS NULL OR mp.expires_at > now())
    AND m.is_active = true
  ) OR EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_modules(user_id_param UUID)
RETURNS TABLE(module_name TEXT, permissions TEXT[])
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT 
    m.name,
    ARRAY_AGG(mp.permission_type) as permissions
  FROM public.gw_modules m
  JOIN public.gw_module_permissions mp ON mp.module_id = m.id
  WHERE mp.user_id = user_id_param 
  AND mp.is_active = true
  AND (mp.expires_at IS NULL OR mp.expires_at > now())
  AND m.is_active = true
  GROUP BY m.name;
$$;

-- Insert the specific modules
INSERT INTO public.gw_modules (name, description, category, is_active, default_permissions) VALUES
('media_library', 'Access to media library with file organization', 'pr', true, '["view"]'),
('hero_manager', 'Manage hero images and featured content', 'pr', true, '["view", "edit"]'),
('pr_manager', 'PR data analytics and management tools', 'pr', true, '["view", "edit"]'),
('ai_tools', 'AI-powered template generation and content tools', 'pr', true, '["view", "use"]'),
('press_kits', 'Create and manage press kits', 'pr', true, '["view", "create", "edit"]');