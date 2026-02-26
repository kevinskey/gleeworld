
-- Drop and recreate INSERT policy to handle both role formats
DROP POLICY "Tour managers and exec board can create notes" ON public.gw_tour_notes;
CREATE POLICY "Tour managers and exec board can create notes"
ON public.gw_tour_notes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (
      gw_profiles.role = ANY (ARRAY['admin', 'super_admin', 'super-admin'])
      OR gw_profiles.is_exec_board = true
    )
  )
);

-- Also fix SELECT policy
DROP POLICY "Tour managers and exec board can view notes" ON public.gw_tour_notes;
CREATE POLICY "Tour managers and exec board can view notes"
ON public.gw_tour_notes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (
      gw_profiles.role = ANY (ARRAY['admin', 'super_admin', 'super-admin'])
      OR gw_profiles.is_exec_board = true
    )
  )
);

-- Also fix UPDATE policy
DROP POLICY "Authors and admins can update notes" ON public.gw_tour_notes;
CREATE POLICY "Authors and admins can update notes"
ON public.gw_tour_notes FOR UPDATE
USING (
  author_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND gw_profiles.role = ANY (ARRAY['admin', 'super_admin', 'super-admin'])
  )
);

-- Also fix DELETE policy
DROP POLICY "Authors and admins can delete notes" ON public.gw_tour_notes;
CREATE POLICY "Authors and admins can delete notes"
ON public.gw_tour_notes FOR DELETE
USING (
  author_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND gw_profiles.role = ANY (ARRAY['admin', 'super_admin', 'super-admin'])
  )
);
