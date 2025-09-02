-- Fix the trigger function to handle INSERT operations properly
CREATE OR REPLACE FUNCTION public.update_mus240_journal_grades_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only set updated_at on UPDATE operations, not INSERT
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$function$;