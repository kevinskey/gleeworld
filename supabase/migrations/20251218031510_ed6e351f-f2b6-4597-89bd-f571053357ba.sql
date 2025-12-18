-- Fix gw_tour_roster RLS to allow admins granted via unified admin check
-- Note: public.is_role_admin() takes no arguments

DROP POLICY IF EXISTS "Admins and exec board can insert tour roster" ON public.gw_tour_roster;
DROP POLICY IF EXISTS "Admins and exec board can update tour roster" ON public.gw_tour_roster;
DROP POLICY IF EXISTS "Admins and exec board can delete tour roster" ON public.gw_tour_roster;
DROP POLICY IF EXISTS "Admins or exec board can insert tour roster" ON public.gw_tour_roster;
DROP POLICY IF EXISTS "Admins or exec board can update tour roster" ON public.gw_tour_roster;
DROP POLICY IF EXISTS "Admins or exec board can delete tour roster" ON public.gw_tour_roster;

CREATE POLICY "Admins or exec board can insert tour roster"
ON public.gw_tour_roster
FOR INSERT
WITH CHECK (
  public.is_role_admin()
  OR EXISTS (
    SELECT 1
    FROM public.gw_profiles p
    WHERE p.user_id = auth.uid()
      AND p.is_exec_board = true
  )
);

CREATE POLICY "Admins or exec board can update tour roster"
ON public.gw_tour_roster
FOR UPDATE
USING (
  public.is_role_admin()
  OR EXISTS (
    SELECT 1
    FROM public.gw_profiles p
    WHERE p.user_id = auth.uid()
      AND p.is_exec_board = true
  )
)
WITH CHECK (
  public.is_role_admin()
  OR EXISTS (
    SELECT 1
    FROM public.gw_profiles p
    WHERE p.user_id = auth.uid()
      AND p.is_exec_board = true
  )
);

CREATE POLICY "Admins or exec board can delete tour roster"
ON public.gw_tour_roster
FOR DELETE
USING (
  public.is_role_admin()
  OR EXISTS (
    SELECT 1
    FROM public.gw_profiles p
    WHERE p.user_id = auth.uid()
      AND p.is_exec_board = true
  )
);
