-- gw_course_grade_categories
--
-- Per-course weighted grade categories. Teachers configure weights in
-- the Instructor Console; the final grade is computed as a weighted
-- average of the per-category percentages (see src/lib/grading/
-- computeCourseGrade.ts for the pure formula).
--
-- `key` is a stable slug the app enumerates against. An assignment's
-- `assignment_type` field maps to this key.
--
-- Weights are validated to sum to 100 by a DEFERRED constraint trigger
-- fired AFTER any INSERT/UPDATE/DELETE. Categories with no graded work
-- are silently excluded from the formula (their weight drops out) so
-- a student's running grade doesn't lurch when the teacher creates the
-- Final Exam category with weight 20 before anyone has taken the final.
--
-- ORDER OF OPERATIONS MATTERS: RLS + policies must be created BEFORE the
-- seed DO block, because the seed inserts leave pending deferred-
-- constraint events which then block any further ALTER TABLE for the
-- rest of the transaction (Postgres 55006).

CREATE TABLE IF NOT EXISTS public.gw_course_grade_categories (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id    uuid NOT NULL REFERENCES public.gw_courses(id) ON DELETE CASCADE,
  key          text NOT NULL,
  label        text NOT NULL,
  weight_pct   numeric(5,2) NOT NULL DEFAULT 0 CHECK (weight_pct >= 0 AND weight_pct <= 100),
  sort_order   int  NOT NULL DEFAULT 0,
  drop_lowest  int  NOT NULL DEFAULT 0 CHECK (drop_lowest >= 0),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, key)
);

CREATE INDEX IF NOT EXISTS idx_gw_course_grade_categories_course
  ON public.gw_course_grade_categories(course_id);

-- Trigger: keep updated_at fresh.
CREATE OR REPLACE FUNCTION public.gw_course_grade_categories_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gw_course_grade_categories_touch
  ON public.gw_course_grade_categories;
CREATE TRIGGER trg_gw_course_grade_categories_touch
  BEFORE UPDATE ON public.gw_course_grade_categories
  FOR EACH ROW EXECUTE FUNCTION public.gw_course_grade_categories_touch();

-- Trigger: weights per course must sum to 100 (± 0.01 for numeric rounding).
-- DEFERRABLE so batch inserts can settle before the check fires at COMMIT.
CREATE OR REPLACE FUNCTION public.gw_course_grade_categories_sum_check()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_course_id uuid;
  v_total     numeric;
BEGIN
  v_course_id := COALESCE(NEW.course_id, OLD.course_id);
  SELECT COALESCE(SUM(weight_pct), 0) INTO v_total
    FROM public.gw_course_grade_categories
   WHERE course_id = v_course_id;
  -- Allow a fully-empty set (course with no categories yet) so admins
  -- can bulk-delete/reseed. Otherwise require ≈ 100.
  IF v_total > 0 AND ABS(v_total - 100) > 0.01 THEN
    RAISE EXCEPTION
      'Grade category weights for course % must sum to 100 (currently %)',
      v_course_id, v_total
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_gw_course_grade_categories_sum
  ON public.gw_course_grade_categories;
CREATE CONSTRAINT TRIGGER trg_gw_course_grade_categories_sum
  AFTER INSERT OR UPDATE OR DELETE ON public.gw_course_grade_categories
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.gw_course_grade_categories_sum_check();

-- Seed helper. Called by the backfill loop below and by app-side course
-- creation flows (safer than an AFTER-INSERT trigger that would fire
-- in RLS-restricted contexts).
CREATE OR REPLACE FUNCTION public.gw_seed_default_grade_categories(p_course_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.gw_course_grade_categories
    (course_id, key,                  label,                weight_pct, sort_order)
  VALUES
    (p_course_id, 'assignments',        'Assignments',        20, 10),
    (p_course_id, 'quizzes',            'Quizzes',            10, 20),
    (p_course_id, 'tests',              'Tests',              15, 30),
    (p_course_id, 'discussions',        'Discussions',         5, 40),
    (p_course_id, 'midterm',            'Midterm',            15, 50),
    (p_course_id, 'final_exam',         'Final Exam',         20, 60),
    (p_course_id, 'group_assignment',   'Group Assignment',   10, 70),
    (p_course_id, 'special_assignment', 'Special Assignment',  5, 80)
  ON CONFLICT (course_id, key) DO NOTHING;
END;
$$;

-- RLS + policies BEFORE the seed DO block (see file header note).
ALTER TABLE public.gw_course_grade_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "grade categories readable to authed users"
  ON public.gw_course_grade_categories;
CREATE POLICY "grade categories readable to authed users"
  ON public.gw_course_grade_categories
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "grade categories writable by course instructors"
  ON public.gw_course_grade_categories;
CREATE POLICY "grade categories writable by course instructors"
  ON public.gw_course_grade_categories
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_course_enrollments e
      WHERE e.course_id = gw_course_grade_categories.course_id
        AND e.user_id = auth.uid()
        AND e.role IN ('instructor', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.gw_profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gw_course_enrollments e
      WHERE e.course_id = gw_course_grade_categories.course_id
        AND e.user_id = auth.uid()
        AND e.role IN ('instructor', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.gw_profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'super_admin')
    )
  );

-- Backfill every existing course. Safe to re-run — ON CONFLICT skips.
-- Deferred sum-check trigger fires at COMMIT.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.gw_courses LOOP
    PERFORM public.gw_seed_default_grade_categories(r.id);
  END LOOP;
END $$;
