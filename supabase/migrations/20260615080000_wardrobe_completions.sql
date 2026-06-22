-- Phase 20: per-student wardrobe item status. Students mark each item as
-- 'have' / 'ordered' / 'need-help'. Instructor sees the rollup.

CREATE TABLE IF NOT EXISTS public.gw_course_wardrobe_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.gw_course_wardrobe_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('have','ordered','need-help')),
  notes text,
  tenant_id uuid DEFAULT current_tenant_id(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, user_id)
);
CREATE INDEX IF NOT EXISTS gw_course_wardrobe_completions_user_idx
  ON public.gw_course_wardrobe_completions(user_id);

ALTER TABLE public.gw_course_wardrobe_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_course_wardrobe_completions;
CREATE POLICY tenant_isolation_restrict ON public.gw_course_wardrobe_completions
  AS RESTRICTIVE
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Students manage their own statuses
DROP POLICY IF EXISTS "Students manage own wardrobe status" ON public.gw_course_wardrobe_completions;
CREATE POLICY "Students manage own wardrobe status" ON public.gw_course_wardrobe_completions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Instructor of the course (via item → course join) reads everyone
DROP POLICY IF EXISTS "Instructor reads wardrobe statuses" ON public.gw_course_wardrobe_completions;
CREATE POLICY "Instructor reads wardrobe statuses" ON public.gw_course_wardrobe_completions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_course_wardrobe_items it
      JOIN public.gw_courses c ON c.id = it.course_id
      WHERE it.id = gw_course_wardrobe_completions.item_id
        AND (c.instructor_id = auth.uid() OR c.created_by = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin OR p.is_super_admin))
  );
