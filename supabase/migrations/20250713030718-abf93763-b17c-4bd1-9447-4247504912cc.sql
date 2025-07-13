-- Create username permissions table for module-specific access control
CREATE TABLE public.username_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  module_name TEXT NOT NULL,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NULL,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_email, module_name)
);

-- Enable RLS
ALTER TABLE public.username_permissions ENABLE ROW LEVEL SECURITY;

-- Create policies for username_permissions
CREATE POLICY "Admins can manage all username permissions"
ON public.username_permissions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);

CREATE POLICY "Users can view their own username permissions"
ON public.username_permissions
FOR SELECT
USING (
  user_email = (
    SELECT email FROM public.profiles WHERE id = auth.uid()
  )
);

-- Create function to check username permissions
CREATE OR REPLACE FUNCTION public.has_username_permission(user_email_param TEXT, module_name_param TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.username_permissions
    WHERE user_email = user_email_param 
    AND module_name = module_name_param
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- Create function to get user's username permissions
CREATE OR REPLACE FUNCTION public.get_user_username_permissions(user_email_param TEXT)
RETURNS TABLE(module_name TEXT, granted_at TIMESTAMP WITH TIME ZONE, expires_at TIMESTAMP WITH TIME ZONE, notes TEXT)
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT up.module_name, up.granted_at, up.expires_at, up.notes
  FROM public.username_permissions up
  WHERE up.user_email = user_email_param 
  AND up.is_active = true
  AND (up.expires_at IS NULL OR up.expires_at > now());
$$;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_username_permissions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_username_permissions_updated_at
  BEFORE UPDATE ON public.username_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_username_permissions_updated_at();