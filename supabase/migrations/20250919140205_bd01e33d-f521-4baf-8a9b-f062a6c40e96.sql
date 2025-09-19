-- Fix missing admin access function and permission issues

-- Create the missing admin access function
CREATE OR REPLACE FUNCTION public.current_user_can_access_admin_modules()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR is_exec_board = true)
  );
$$;

-- Create function to check if user has username permission for a module
CREATE OR REPLACE FUNCTION public.user_has_username_permission(user_email_param text, module_name_param text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.username_permissions
    WHERE user_email = user_email_param 
    AND module_name = module_name_param
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- Create function to get current user email
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;