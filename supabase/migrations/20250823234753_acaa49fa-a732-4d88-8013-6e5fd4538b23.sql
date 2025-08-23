-- Remove the trigger that's enforcing the old ownership-only deletion logic
DROP TRIGGER IF EXISTS trg_gw_bol_owner_delete ON public.gw_buckets_of_love;

-- Also remove the function since it's no longer needed
DROP FUNCTION IF EXISTS public.ensure_bol_owner_delete();