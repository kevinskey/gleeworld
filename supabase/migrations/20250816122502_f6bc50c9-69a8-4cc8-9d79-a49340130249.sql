-- Remove duplicate/conflicting policies
DROP POLICY IF EXISTS "Alumnae liaisons can view alumnae profiles" ON public.gw_profiles;
DROP POLICY IF EXISTS "Alumnae liaisons can update alumnae profiles" ON public.gw_profiles;