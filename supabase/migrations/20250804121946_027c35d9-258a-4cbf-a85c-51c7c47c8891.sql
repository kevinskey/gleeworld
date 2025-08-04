-- Update the clean_admin_bootstrap to use the new approach
CREATE OR REPLACE FUNCTION public.clean_admin_bootstrap()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.emergency_admin_bootstrap();
END;
$function$