-- Create permission groups/roles system
CREATE TABLE public.permission_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create junction table for group permissions
CREATE TABLE public.permission_group_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.permission_groups(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL, -- References the granular permission IDs
  permission_level TEXT NOT NULL DEFAULT 'full' CHECK (permission_level IN ('view', 'edit', 'full', 'admin')),
  permission_scope TEXT DEFAULT 'system' CHECK (permission_scope IN ('own', 'department', 'system')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(group_id, permission_id)
);

-- Create junction table for user group assignments
CREATE TABLE public.user_permission_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.permission_groups(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, group_id)
);

-- Enable RLS
ALTER TABLE public.permission_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_group_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permission_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for permission_groups
CREATE POLICY "Admins can manage permission groups"
ON public.permission_groups
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Users can view active permission groups"
ON public.permission_groups
FOR SELECT
TO authenticated
USING (is_active = true);

-- RLS Policies for permission_group_permissions
CREATE POLICY "Admins can manage group permissions"
ON public.permission_group_permissions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Users can view group permissions"
ON public.permission_group_permissions
FOR SELECT
TO authenticated
USING (true);

-- RLS Policies for user_permission_groups
CREATE POLICY "Admins can manage user group assignments"
ON public.user_permission_groups
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Users can view their own group assignments"
ON public.user_permission_groups
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create function to get user permissions from groups
CREATE OR REPLACE FUNCTION public.get_user_group_permissions(user_id_param UUID)
RETURNS TABLE(
  permission_id TEXT,
  permission_level TEXT,
  permission_scope TEXT,
  group_name TEXT
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT 
    pgp.permission_id,
    pgp.permission_level,
    pgp.permission_scope,
    pg.name as group_name
  FROM public.user_permission_groups upg
  JOIN public.permission_groups pg ON pg.id = upg.group_id
  JOIN public.permission_group_permissions pgp ON pgp.group_id = pg.id
  WHERE upg.user_id = user_id_param
    AND upg.is_active = true
    AND pg.is_active = true
    AND (upg.expires_at IS NULL OR upg.expires_at > now());
$$;

-- Create function to check if user has group permission
CREATE OR REPLACE FUNCTION public.has_group_permission(
  user_id_param UUID,
  permission_id_param TEXT,
  required_level TEXT DEFAULT 'view'
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.get_user_group_permissions(user_id_param) gup
    WHERE gup.permission_id = permission_id_param
    AND (
      (required_level = 'view' AND gup.permission_level IN ('view', 'edit', 'full', 'admin')) OR
      (required_level = 'edit' AND gup.permission_level IN ('edit', 'full', 'admin')) OR
      (required_level = 'full' AND gup.permission_level IN ('full', 'admin')) OR
      (required_level = 'admin' AND gup.permission_level = 'admin')
    )
  );
$$;

-- Insert default permission groups
INSERT INTO public.permission_groups (name, description, color, is_default) VALUES
('Member', 'Regular Glee Club members', '#10b981', true),
('Executive Board', 'Executive board members with leadership responsibilities', '#f59e0b', true),
('Alumnae', 'Glee Club alumnae with access to historical content', '#8b5cf6', true),
('Fan', 'General fans and supporters', '#06b6d4', true),
('Admin', 'System administrators with full access', '#ef4444', true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_permission_groups_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_permission_groups_updated_at
  BEFORE UPDATE ON public.permission_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_permission_groups_updated_at();