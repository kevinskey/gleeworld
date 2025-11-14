-- Add RLS policy to allow instructors/admins/TAs to view all journal entries for MUS240
CREATE POLICY "instructors_view_all_journals"
ON public.mus240_journal_entries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid()
    AND (p.is_admin = true OR p.is_super_admin = true OR p.role = 'instructor')
  )
  OR EXISTS (
    SELECT 1 FROM public.course_teaching_assistants ta
    WHERE ta.user_id = auth.uid()
    AND ta.course_code = 'MUS240'
    AND ta.is_active = true
  )
);

-- Add RLS policy to allow instructors/admins/TAs to view all peer reviews for MUS240
CREATE POLICY "instructors_view_all_reviews"
ON public.mus240_peer_reviews
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid()
    AND (p.is_admin = true OR p.is_super_admin = true OR p.role = 'instructor')
  )
  OR EXISTS (
    SELECT 1 FROM public.course_teaching_assistants ta
    WHERE ta.user_id = auth.uid()
    AND ta.course_code = 'MUS240'
    AND ta.is_active = true
  )
);