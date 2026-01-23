-- Fix RLS for course_announcements: allow admins to UPDATE/DELETE (and restrict INSERT to authenticated admins)

-- INSERT policy
DROP POLICY IF EXISTS "Admins can create announcements" ON public.course_announcements;
CREATE POLICY "Admins can create announcements"
ON public.course_announcements
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.app_roles
    WHERE app_roles.user_id = auth.uid()
      AND app_roles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
      AND app_roles.is_active = true
  )
);

-- UPDATE policy
DROP POLICY IF EXISTS "Admins can update announcements" ON public.course_announcements;
CREATE POLICY "Admins can update announcements"
ON public.course_announcements
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.app_roles
    WHERE app_roles.user_id = auth.uid()
      AND app_roles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
      AND app_roles.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.app_roles
    WHERE app_roles.user_id = auth.uid()
      AND app_roles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
      AND app_roles.is_active = true
  )
);

-- DELETE policy
DROP POLICY IF EXISTS "Admins can delete announcements" ON public.course_announcements;
CREATE POLICY "Admins can delete announcements"
ON public.course_announcements
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.app_roles
    WHERE app_roles.user_id = auth.uid()
      AND app_roles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
      AND app_roles.is_active = true
  )
);
