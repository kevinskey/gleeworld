-- adopt_course_template: admin-only.
--
-- Adding a new class to the tenant — whether from scratch or by adopting
-- a template — is an admin action. Plain instructors who only teach
-- existing classes shouldn't be able to spin up new ones. Admins who
-- also instruct still pass because is_admin/is_super_admin are true.

CREATE OR REPLACE FUNCTION public.adopt_course_template(p_template_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_tenant_id uuid;
  v_is_demo_viewer boolean;
  v_is_admin boolean;
  v_template gw_courses%ROWTYPE;
  v_new_course_id uuid;
  v_new_course_code text;
  v_attempt int;
  v_module RECORD;
  v_old_to_new_module_id jsonb := '{}'::jsonb;
  v_new_module_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT tenant_id,
         COALESCE(is_demo_viewer, false),
         COALESCE(is_admin, false) OR COALESCE(is_super_admin, false)
    INTO v_tenant_id, v_is_demo_viewer, v_is_admin
    FROM gw_profiles
   WHERE user_id = v_user_id
   LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'no_tenant_for_user';
  END IF;

  IF v_is_demo_viewer THEN
    RAISE EXCEPTION 'demo_viewer_cannot_adopt';
  END IF;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'admin_required_to_adopt';
  END IF;

  SELECT * INTO v_template FROM gw_courses
   WHERE id = p_template_id AND is_template = true AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'template_not_found_or_inactive';
  END IF;

  v_new_course_code := v_template.course_code;
  v_attempt := 1;
  WHILE EXISTS (
    SELECT 1 FROM gw_courses
     WHERE tenant_id = v_tenant_id AND course_code = v_new_course_code
  ) LOOP
    v_attempt := v_attempt + 1;
    v_new_course_code := v_template.course_code || ' (' || v_attempt || ')';
  END LOOP;

  INSERT INTO gw_courses (
    course_code, code, title, description, term, semester,
    instructor_id, instructor_name, instructor_email,
    syllabus_url, default_location, timezone, meeting_patterns,
    is_active, is_free, price_cents, max_enrollment,
    show_assignments, show_discussions, show_journals, show_polls, show_tests, show_grades,
    is_template, created_by, tenant_id
  ) VALUES (
    v_new_course_code, v_new_course_code,
    v_template.title, v_template.description,
    NULL, NULL,
    v_user_id,
    (SELECT full_name FROM gw_profiles WHERE user_id = v_user_id LIMIT 1),
    (SELECT email      FROM gw_profiles WHERE user_id = v_user_id LIMIT 1),
    v_template.syllabus_url, v_template.default_location, v_template.timezone, v_template.meeting_patterns,
    true, COALESCE(v_template.is_free, true), v_template.price_cents, v_template.max_enrollment,
    v_template.show_assignments, v_template.show_discussions, v_template.show_journals,
    v_template.show_polls, v_template.show_tests, v_template.show_grades,
    false, v_user_id, v_tenant_id
  )
  RETURNING id INTO v_new_course_id;

  FOR v_module IN
    SELECT * FROM gw_course_modules WHERE course_id = p_template_id
  LOOP
    INSERT INTO gw_course_modules (
      course_id, title, description, display_order, is_published, tenant_id
    ) VALUES (
      v_new_course_id, v_module.title, v_module.description, v_module.display_order,
      COALESCE(v_module.is_published, true), v_tenant_id
    )
    RETURNING id INTO v_new_module_id;
    v_old_to_new_module_id := jsonb_set(v_old_to_new_module_id,
      ARRAY[v_module.id::text], to_jsonb(v_new_module_id::text));
  END LOOP;

  INSERT INTO gw_course_outline_items (
    course_id, item_type, content, position, due_at, link_url, tenant_id
  )
  SELECT
    v_new_course_id, oi.item_type, oi.content, oi.position, oi.due_at, oi.link_url,
    v_tenant_id
  FROM gw_course_outline_items oi
  WHERE oi.course_id = p_template_id;

  INSERT INTO gw_assignments (
    course_id, title, description, assignment_type, category, points,
    due_at, is_active, tenant_id, created_by
  )
  SELECT
    v_new_course_id, title, description, assignment_type, category, points,
    NULL, COALESCE(is_active, true), v_tenant_id, v_user_id
  FROM gw_assignments
  WHERE course_id = p_template_id;

  INSERT INTO gw_course_tests (
    course_id, title, duration_minutes, max_attempts, allow_retakes,
    show_results_immediately, randomize_questions, total_points,
    is_published, tenant_id, created_by
  )
  SELECT
    v_new_course_id, title, duration_minutes, max_attempts, allow_retakes,
    show_results_immediately, randomize_questions, total_points,
    false, v_tenant_id, v_user_id
  FROM gw_course_tests
  WHERE course_id = p_template_id;

  RETURN v_new_course_id;
END;
$function$;
