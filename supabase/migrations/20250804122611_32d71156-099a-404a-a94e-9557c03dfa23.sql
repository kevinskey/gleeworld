-- Step 1: Migrate any data from profiles to gw_profiles if needed
INSERT INTO public.gw_profiles (
  user_id, email, full_name, role, is_admin, is_super_admin, created_at, updated_at
)
SELECT 
  p.id as user_id,
  p.email,
  p.full_name,
  p.role,
  CASE WHEN p.role IN ('admin', 'super-admin') THEN true ELSE false END as is_admin,
  CASE WHEN p.role = 'super-admin' THEN true ELSE false END as is_super_admin,
  p.created_at,
  p.updated_at
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.gw_profiles gw WHERE gw.user_id = p.id
);

-- Step 2: Update existing gw_profiles with any missing data from profiles
UPDATE public.gw_profiles 
SET 
  email = COALESCE(gw_profiles.email, p.email),
  full_name = COALESCE(gw_profiles.full_name, p.full_name),
  role = COALESCE(gw_profiles.role, p.role),
  is_admin = CASE 
    WHEN gw_profiles.is_admin = true THEN true 
    WHEN p.role IN ('admin', 'super-admin') THEN true 
    ELSE false 
  END,
  is_super_admin = CASE 
    WHEN gw_profiles.is_super_admin = true THEN true 
    WHEN p.role = 'super-admin' THEN true 
    ELSE false 
  END,
  updated_at = now()
FROM public.profiles p
WHERE gw_profiles.user_id = p.id;

-- Step 3: Update all functions that reference profiles to use gw_profiles instead

-- Update is_admin function
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = _user_id AND (is_admin = true OR role = 'admin')
    );
$function$;

-- Update is_super_admin function
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1 FROM public.gw_profiles 
        WHERE user_id = _user_id AND (is_super_admin = true OR role = 'super-admin')
    );
$function$;

-- Update get_current_user_role function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT role FROM public.gw_profiles WHERE user_id = auth.uid();
$function$;

-- Update current_user_is_admin function
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true OR role IN ('admin', 'super-admin'))
  );
$function$;

-- Update is_current_user_admin_safe function
CREATE OR REPLACE FUNCTION public.is_current_user_admin_safe()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR role IN ('admin', 'super-admin'))
  );
$function$;

-- Update is_current_user_super_admin_safe function
CREATE OR REPLACE FUNCTION public.is_current_user_super_admin_safe()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_super_admin = true OR role = 'super-admin')
  );
$function$;

-- Update admin_create_user function to use gw_profiles
CREATE OR REPLACE FUNCTION public.admin_create_user(user_email text, user_full_name text DEFAULT ''::text, user_role text DEFAULT 'user'::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  new_user_id uuid;
  temp_password text;
  result json;
BEGIN
  -- Check if current user is admin or super-admin using gw_profiles
  IF NOT (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Permission denied: Only admins can create users';
  END IF;
  
  -- Generate a temporary password (8 characters)
  temp_password := substring(encode(gen_random_bytes(6), 'base64') from 1 for 8);
  
  result := json_build_object(
    'email', user_email,
    'full_name', user_full_name,
    'role', user_role,
    'temp_password', temp_password
  );
  
  RETURN result;
END;
$function$;

-- Update get_all_user_profiles function to use gw_profiles
CREATE OR REPLACE FUNCTION public.get_all_user_profiles()
RETURNS TABLE(id uuid, email text, full_name text, role text, created_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT gw.user_id as id, gw.email, gw.full_name, gw.role, gw.created_at
    FROM public.gw_profiles gw
    WHERE (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()));
$function$;

-- Update prevent_self_privilege_escalation function
CREATE OR REPLACE FUNCTION public.prevent_self_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only prevent if user exists and is trying to change their own role
  IF OLD.user_id IS NOT NULL AND OLD.user_id = auth.uid() AND OLD.role != NEW.role THEN
    RAISE EXCEPTION 'Security violation: Cannot modify your own role. Use proper admin functions.';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Add trigger to gw_profiles if it doesn't exist
DROP TRIGGER IF EXISTS prevent_self_privilege_escalation_trigger ON public.gw_profiles;
CREATE TRIGGER prevent_self_privilege_escalation_trigger
  BEFORE UPDATE ON public.gw_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_privilege_escalation();

-- Step 4: Drop the profiles table and its related objects
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.profiles CASCADE;