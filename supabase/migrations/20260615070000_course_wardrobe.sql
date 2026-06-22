-- Phase 19: per-course wardrobe items. Each row = one required garment
-- or accessory for this class's performances. Instructor manages, students
-- see read-only.

CREATE TABLE IF NOT EXISTS public.gw_course_wardrobe_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.gw_courses(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  name text NOT NULL,
  description text,
  due_date date,
  is_provided_by_program boolean NOT NULL DEFAULT false,
  tenant_id uuid DEFAULT current_tenant_id(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gw_course_wardrobe_items_course_idx
  ON public.gw_course_wardrobe_items(course_id, position);

ALTER TABLE public.gw_course_wardrobe_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_course_wardrobe_items;
CREATE POLICY tenant_isolation_restrict ON public.gw_course_wardrobe_items
  AS RESTRICTIVE
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Instructor manages wardrobe" ON public.gw_course_wardrobe_items;
CREATE POLICY "Instructor manages wardrobe" ON public.gw_course_wardrobe_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_courses c
      WHERE c.id = gw_course_wardrobe_items.course_id
        AND (c.instructor_id = auth.uid() OR c.created_by = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin OR p.is_super_admin))
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gw_courses c
      WHERE c.id = gw_course_wardrobe_items.course_id
        AND (c.instructor_id = auth.uid() OR c.created_by = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin OR p.is_super_admin))
  );

DROP POLICY IF EXISTS "Enrolled students read wardrobe" ON public.gw_course_wardrobe_items;
CREATE POLICY "Enrolled students read wardrobe" ON public.gw_course_wardrobe_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_course_enrollments e
      WHERE e.course_id = gw_course_wardrobe_items.course_id
        AND e.user_id = auth.uid()
        AND e.enrollment_status IN ('enrolled','active','in_progress','registered')
    )
  );
