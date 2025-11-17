-- Backfill legacy MUS240 journals into new grading system and set up ongoing sync (fixed graded_by)

-- 2) Backfill journal entries -> gw_assignment_submissions
INSERT INTO public.gw_assignment_submissions (
  id,
  assignment_id,
  user_id,
  notes,
  submitted_at,
  created_at,
  status
)
SELECT 
  je.id,
  ga.id AS assignment_id,
  je.student_id AS user_id,
  je.content AS notes,
  je.created_at AS submitted_at,
  COALESCE(je.created_at, now()) AS created_at,
  'submitted'::public.assignment_status AS status
FROM public.mus240_journal_entries je
JOIN public.gw_assignments ga
  ON (ga.legacy_id::text = je.assignment_id::text)
  AND (ga.legacy_source IN ('mus240','mus240_assignments'))
LEFT JOIN public.gw_assignment_submissions s
  ON s.id = je.id
WHERE s.id IS NULL;

-- 3) Backfill grades -> update gw_assignment_submissions (use journal_id; set graded_by to instructor_id UUID)
UPDATE public.gw_assignment_submissions s
SET 
  score_value = COALESCE(g.instructor_score, g.overall_score),
  feedback = COALESCE(g.instructor_feedback, g.ai_feedback),
  graded_at = COALESCE(g.instructor_graded_at, g.graded_at),
  graded_by = COALESCE(g.instructor_id, s.graded_by),
  updated_at = now()
FROM public.mus240_journal_grades g
WHERE s.id = g.journal_id;

-- 4) Ongoing sync: journals -> gw
CREATE OR REPLACE FUNCTION public.sync_mus240_journal_to_gw()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_assignment_id uuid;
BEGIN
  SELECT id INTO new_assignment_id
  FROM public.gw_assignments
  WHERE legacy_id::text = NEW.assignment_id::text
    AND legacy_source IN ('mus240','mus240_assignments')
  LIMIT 1;

  IF new_assignment_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.gw_assignment_submissions (
    id, assignment_id, user_id, notes, submitted_at, created_at, status
  ) VALUES (
    NEW.id, new_assignment_id, NEW.student_id, NEW.content,
    COALESCE(NEW.created_at, now()), COALESCE(NEW.created_at, now()),
    'submitted'::public.assignment_status
  )
  ON CONFLICT (id) DO UPDATE SET
    assignment_id = EXCLUDED.assignment_id,
    user_id       = EXCLUDED.user_id,
    notes         = EXCLUDED.notes,
    submitted_at  = EXCLUDED.submitted_at,
    updated_at    = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_mus240_journal_to_gw ON public.mus240_journal_entries;
CREATE TRIGGER trg_sync_mus240_journal_to_gw
AFTER INSERT OR UPDATE ON public.mus240_journal_entries
FOR EACH ROW EXECUTE FUNCTION public.sync_mus240_journal_to_gw();

-- 5) Ongoing sync: grades -> gw
CREATE OR REPLACE FUNCTION public.sync_mus240_grade_to_gw()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.gw_assignment_submissions s
  SET 
    score_value = COALESCE(NEW.instructor_score, NEW.overall_score),
    feedback    = COALESCE(NEW.instructor_feedback, NEW.ai_feedback),
    graded_at   = COALESCE(NEW.instructor_graded_at, NEW.graded_at),
    graded_by   = COALESCE(NEW.instructor_id, s.graded_by),
    updated_at  = now()
  WHERE s.id = NEW.journal_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_mus240_grade_to_gw ON public.mus240_journal_grades;
CREATE TRIGGER trg_sync_mus240_grade_to_gw
AFTER INSERT OR UPDATE ON public.mus240_journal_grades
FOR EACH ROW EXECUTE FUNCTION public.sync_mus240_grade_to_gw();
