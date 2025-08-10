-- Create or replace function to count scheduled auditions
CREATE OR REPLACE FUNCTION public.get_scheduled_auditions_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COUNT(*)::integer FROM public.gw_auditions;
$function$;

-- Ensure execution permissions for clients
GRANT EXECUTE ON FUNCTION public.get_scheduled_auditions_count() TO anon, authenticated;