-- Create a secure RPC to return total audition applications
CREATE OR REPLACE FUNCTION public.get_audition_application_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COUNT(*)::integer FROM public.audition_applications;
$function$;

-- Grant execute to public roles
GRANT EXECUTE ON FUNCTION public.get_audition_application_count() TO anon, authenticated;