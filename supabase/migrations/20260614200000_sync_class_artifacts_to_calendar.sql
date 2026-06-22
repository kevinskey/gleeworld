-- Auto-sync course artifacts (assignments + tests) onto the main calendar.
--
-- When a course is created, ensure it has a gw_calendars row so all its
-- artifacts share a color/group on the main calendar. When an assignment
-- or test is added/updated/deleted, the matching gw_events row is
-- kept in sync via (external_id, external_source, calendar_id).

-- ── Courses: ensure each course has a calendar ──────────────────────────

CREATE OR REPLACE FUNCTION public.gw_course_ensure_calendar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_calendar_id uuid;
BEGIN
  IF NEW.calendar_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.gw_calendars (name, description, color, is_visible, created_by, tenant_id)
  VALUES (
    COALESCE(NEW.title, NEW.course_code, 'Course'),
    'Auto-created for course ' || COALESCE(NEW.course_code, NEW.code, ''),
    '#7c3aed',
    true,
    NEW.created_by,
    NEW.tenant_id
  )
  RETURNING id INTO v_calendar_id;
  NEW.calendar_id := v_calendar_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gw_course_ensure_calendar ON public.gw_courses;
CREATE TRIGGER trg_gw_course_ensure_calendar
  BEFORE INSERT ON public.gw_courses
  FOR EACH ROW
  EXECUTE FUNCTION public.gw_course_ensure_calendar();

-- Backfill calendars for existing courses without one.
DO $$
DECLARE
  c RECORD;
  v_cal uuid;
BEGIN
  FOR c IN SELECT id, title, course_code, code, created_by, tenant_id FROM public.gw_courses WHERE calendar_id IS NULL LOOP
    INSERT INTO public.gw_calendars (name, description, color, is_visible, created_by, tenant_id)
    VALUES (
      COALESCE(c.title, c.course_code, 'Course'),
      'Auto-created for course ' || COALESCE(c.course_code, c.code, ''),
      '#7c3aed',
      true,
      c.created_by,
      c.tenant_id
    )
    RETURNING id INTO v_cal;
    UPDATE public.gw_courses SET calendar_id = v_cal WHERE id = c.id;
  END LOOP;
END;
$$;

-- ── Assignments → gw_events ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.gw_assignment_sync_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_calendar_id uuid;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM public.gw_events
      WHERE external_source = 'gw_assignments'
        AND external_id = OLD.id::text
        AND tenant_id = OLD.tenant_id;
    RETURN OLD;
  END IF;

  -- For UPDATE/INSERT, if assignment is inactive or has no due date, ensure
  -- there is no calendar row, then bail.
  IF NEW.is_active IS FALSE OR NEW.due_at IS NULL THEN
    DELETE FROM public.gw_events
      WHERE external_source = 'gw_assignments'
        AND external_id = NEW.id::text
        AND tenant_id = NEW.tenant_id;
    RETURN NEW;
  END IF;

  -- Get the course's calendar_id so the assignment shares the course color.
  SELECT calendar_id INTO v_calendar_id FROM public.gw_courses WHERE id = NEW.course_id;

  INSERT INTO public.gw_events (
    title, description, start_date, end_date, all_day, category,
    course_id, calendar_id, external_id, external_source,
    is_public, status, created_by, tenant_id
  ) VALUES (
    'Due: ' || COALESCE(NEW.title, 'Assignment'),
    NEW.description,
    NEW.due_at,
    NEW.due_at,
    false,
    'assignment',
    NEW.course_id,
    v_calendar_id,
    NEW.id::text,
    'gw_assignments',
    false,
    'confirmed',
    NEW.created_by,
    NEW.tenant_id
  )
  ON CONFLICT (external_id, external_source, calendar_id) DO UPDATE
    SET title       = EXCLUDED.title,
        description = EXCLUDED.description,
        start_date  = EXCLUDED.start_date,
        end_date    = EXCLUDED.end_date,
        course_id   = EXCLUDED.course_id,
        updated_at  = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gw_assignment_sync_event ON public.gw_assignments;
CREATE TRIGGER trg_gw_assignment_sync_event
  AFTER INSERT OR UPDATE OR DELETE ON public.gw_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.gw_assignment_sync_event();

-- ── Course tests → gw_events ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.gw_course_test_sync_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_calendar_id uuid;
  v_start timestamptz;
  v_end   timestamptz;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM public.gw_events
      WHERE external_source = 'gw_course_tests'
        AND external_id = OLD.id::text
        AND tenant_id = OLD.tenant_id;
    RETURN OLD;
  END IF;

  -- Prefer available_from, fall back to available_until; if neither, no event.
  v_start := COALESCE(NEW.available_from, NEW.available_until);
  IF NEW.is_published IS FALSE OR v_start IS NULL THEN
    DELETE FROM public.gw_events
      WHERE external_source = 'gw_course_tests'
        AND external_id = NEW.id::text
        AND tenant_id = NEW.tenant_id;
    RETURN NEW;
  END IF;
  v_end := COALESCE(NEW.available_until, v_start + (COALESCE(NEW.duration_minutes, 60) || ' minutes')::interval);

  SELECT calendar_id INTO v_calendar_id FROM public.gw_courses WHERE id = NEW.course_id;

  INSERT INTO public.gw_events (
    title, description, start_date, end_date, all_day, category,
    course_id, calendar_id, external_id, external_source,
    is_public, status, created_by, tenant_id
  ) VALUES (
    'Test: ' || COALESCE(NEW.title, 'Exam'),
    NULL,
    v_start,
    v_end,
    false,
    'test',
    NEW.course_id,
    v_calendar_id,
    NEW.id::text,
    'gw_course_tests',
    false,
    'confirmed',
    NEW.created_by,
    NEW.tenant_id
  )
  ON CONFLICT (external_id, external_source, calendar_id) DO UPDATE
    SET title       = EXCLUDED.title,
        start_date  = EXCLUDED.start_date,
        end_date    = EXCLUDED.end_date,
        course_id   = EXCLUDED.course_id,
        updated_at  = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gw_course_test_sync_event ON public.gw_course_tests;
CREATE TRIGGER trg_gw_course_test_sync_event
  AFTER INSERT OR UPDATE OR DELETE ON public.gw_course_tests
  FOR EACH ROW
  EXECUTE FUNCTION public.gw_course_test_sync_event();

-- ── Backfill events for existing assignments and tests ──────────────────

INSERT INTO public.gw_events (
  title, description, start_date, end_date, all_day, category,
  course_id, calendar_id, external_id, external_source,
  is_public, status, created_by, tenant_id
)
SELECT
  'Due: ' || COALESCE(a.title, 'Assignment'),
  a.description, a.due_at, a.due_at, false, 'assignment',
  a.course_id, c.calendar_id, a.id::text, 'gw_assignments',
  false, 'confirmed', a.created_by, a.tenant_id
FROM public.gw_assignments a
JOIN public.gw_courses c ON c.id = a.course_id
WHERE a.is_active IS NOT FALSE
  AND a.due_at IS NOT NULL
  AND c.calendar_id IS NOT NULL
ON CONFLICT (external_id, external_source, calendar_id) DO NOTHING;

INSERT INTO public.gw_events (
  title, description, start_date, end_date, all_day, category,
  course_id, calendar_id, external_id, external_source,
  is_public, status, created_by, tenant_id
)
SELECT
  'Test: ' || COALESCE(t.title, 'Exam'),
  NULL,
  COALESCE(t.available_from, t.available_until),
  COALESCE(t.available_until, t.available_from + (COALESCE(t.duration_minutes, 60) || ' minutes')::interval),
  false, 'test',
  t.course_id, c.calendar_id, t.id::text, 'gw_course_tests',
  false, 'confirmed', t.created_by, t.tenant_id
FROM public.gw_course_tests t
JOIN public.gw_courses c ON c.id = t.course_id
WHERE t.is_published IS NOT FALSE
  AND COALESCE(t.available_from, t.available_until) IS NOT NULL
  AND c.calendar_id IS NOT NULL
ON CONFLICT (external_id, external_source, calendar_id) DO NOTHING;
