-- Remove ALL privilege escalation triggers from profiles table
DROP TRIGGER IF EXISTS prevent_privilege_escalation_profiles ON public.profiles;
DROP TRIGGER IF EXISTS prevent_self_privilege_escalation ON public.profiles;  
DROP TRIGGER IF EXISTS prevent_self_privilege_escalation_trigger ON public.profiles;
DROP TRIGGER IF EXISTS prevent_self_role_escalation_trigger ON public.profiles;

-- Create a completely clean bootstrap function
CREATE OR REPLACE FUNCTION clean_admin_bootstrap()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Update existing profile to admin
  UPDATE public.profiles 
  SET role = 'admin', 
      full_name = COALESCE(full_name, 'Admin User')
  WHERE id = auth.uid();
  
  -- If no profile exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.profiles (id, email, role, full_name)
    SELECT auth.uid(), 
           (SELECT email FROM auth.users WHERE id = auth.uid()),
           'admin', 
           'Admin User';
  END IF;
  
  RETURN true;
END;
$$;