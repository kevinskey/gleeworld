-- Fix the is_instructor_or_admin function to use user_id instead of id
CREATE OR REPLACE FUNCTION public.is_instructor_or_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.gw_profiles p
    WHERE p.user_id = _uid
      AND (p.role = 'instructor' OR p.is_admin = true OR p.is_super_admin = true)
  );
$$;