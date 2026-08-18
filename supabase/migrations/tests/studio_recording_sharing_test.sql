-- studio_recording_sharing_test.sql — run AFTER the migration; rolls back.
BEGIN;

-- Schema landed.
DO $$
BEGIN
  ASSERT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gw_media_library' AND column_name = 'source_media_id'),
    'gw_media_library.source_media_id missing';
  ASSERT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gw_course_assignments' AND column_name = 'media_id'),
    'gw_course_assignments.media_id missing';
  ASSERT to_regclass('public.gw_media_item_shares') IS NOT NULL,
    'gw_media_item_shares missing';
END $$;

-- RLS behavior with simulated users. Uses two real same-tenant users
-- (teacher = a course instructor, student = an enrollee of that course,
-- outsider = same-tenant user not in the course).
DO $$
DECLARE
  v_course   record;  -- id, tenant_id, instructor_id
  v_student  record;  -- user_id, email
  v_outsider record;  -- user_id, email
  v_orig     uuid; v_copy uuid; v_student_row uuid;
  v_cnt int;
BEGIN
  SELECT c.id, c.tenant_id, c.instructor_id INTO v_course
  FROM gw_courses c
  JOIN gw_course_enrollments e ON e.course_id = c.id
  WHERE c.instructor_id IS NOT NULL AND c.tenant_id IS NOT NULL
  LIMIT 1;
  IF v_course IS NULL THEN RAISE NOTICE 'no instructed+enrolled course, skipping RLS sim'; RETURN; END IF;

  SELECT e.user_id, u.email INTO v_student
  FROM gw_course_enrollments e JOIN auth.users u ON u.id = e.user_id
  WHERE e.course_id = v_course.id AND e.user_id <> v_course.instructor_id
  LIMIT 1;

  SELECT m.user_id, u.email INTO v_outsider
  FROM gw_tenant_members m JOIN auth.users u ON u.id = m.user_id
  WHERE m.tenant_id = v_course.tenant_id
    AND m.user_id <> v_course.instructor_id
    AND NOT EXISTS (SELECT 1 FROM gw_course_enrollments e
                    WHERE e.course_id = v_course.id AND e.user_id = m.user_id)
  LIMIT 1;
  IF v_student IS NULL OR v_outsider IS NULL THEN
    RAISE NOTICE 'insufficient users for sim, skipping'; RETURN;
  END IF;

  -- Fixture: private Studio original + class copy, owned by the instructor.
  INSERT INTO gw_media_library (title, file_url, file_path, file_type, file_size,
    folder, category, is_public, is_featured, is_deleted, course_id, uploaded_by,
    download_count, view_count, tenant_id)
  VALUES ('rls-test-orig', 'https://x/orig.wav', 'media/t/orig.wav', 'audio/wav', 1,
    'Studio', 'studio', false, false, false, NULL, v_course.instructor_id, 0, 0, v_course.tenant_id)
  RETURNING id INTO v_orig;

  INSERT INTO gw_media_library (title, file_url, file_path, file_type, file_size,
    folder, category, is_public, is_featured, is_deleted, course_id, uploaded_by,
    download_count, view_count, tenant_id, source_media_id)
  VALUES ('rls-test-copy', 'https://x/orig.wav', 'media/t/orig.wav', 'audio/wav', 1,
    NULL, 'studio', false, false, false, v_course.id, v_course.instructor_id, 0, 0,
    v_course.tenant_id, v_orig)
  RETURNING id INTO v_copy;

  -- Item share of the ORIGINAL to the outsider's email.
  INSERT INTO gw_media_item_shares (media_id, owner_user_id, invited_email, tenant_id)
  VALUES (v_orig, v_course.instructor_id, v_outsider.email, v_course.tenant_id);

  -- Simulate the enrolled student.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_student.user_id, 'role', 'authenticated',
                      'email', v_student.email, 'tenant_id', v_course.tenant_id)::text, true);
  SET LOCAL ROLE authenticated;

  SELECT count(*) INTO v_cnt FROM gw_media_library WHERE id = v_copy;
  ASSERT v_cnt = 1, 'enrolled student must see the class copy';
  SELECT count(*) INTO v_cnt FROM gw_media_library WHERE id = v_orig;
  ASSERT v_cnt = 0, 'student must NOT see the private original';

  -- Student CAN insert their own row into an enrolled course (shipped behavior).
  INSERT INTO gw_media_library (title, file_url, file_path, file_type, file_size,
    folder, category, is_public, is_featured, is_deleted, course_id, uploaded_by,
    download_count, view_count, tenant_id)
  VALUES ('student-upload', 'https://x/s.wav', 'media/t/s.wav', 'audio/wav', 1,
    NULL, 'general', false, false, false, v_course.id, v_student.user_id, 0, 0, v_course.tenant_id)
  RETURNING id INTO v_student_row;
  ASSERT v_student_row IS NOT NULL, 'enrolled student must be able to insert their own row into their course';

  -- Simulate the outsider (same tenant, not enrolled): sees the shared
  -- original via the item share, but not the class copy.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_outsider.user_id, 'role', 'authenticated',
                      'email', v_outsider.email, 'tenant_id', v_course.tenant_id)::text, true);

  SELECT count(*) INTO v_cnt FROM gw_media_library WHERE id = v_orig;
  ASSERT v_cnt = 1, 'item-share grantee must see the shared original';
  SELECT count(*) INTO v_cnt FROM gw_media_library WHERE id = v_copy;
  ASSERT v_cnt = 0, 'non-enrolled member must NOT see the class copy';

  -- Outsider cannot forge a course-tagged insert into an unrelated course (write-side gate).
  BEGIN
    INSERT INTO gw_media_library (title, file_url, file_path, file_type, file_size,
      folder, category, is_public, is_featured, is_deleted, course_id, uploaded_by,
      download_count, view_count, tenant_id)
    VALUES ('forged', 'https://x/f.wav', 'media/t/f.wav', 'audio/wav', 1,
      NULL, 'general', false, false, false, v_course.id, v_outsider.user_id, 0, 0, v_course.tenant_id);
    RAISE EXCEPTION 'outsider insert with course_id must be rejected';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN NULL;
  END;

  -- Revocation kills access.
  RESET ROLE;
  UPDATE gw_media_item_shares SET revoked_at = now() WHERE media_id = v_orig;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_outsider.user_id, 'role', 'authenticated',
                      'email', v_outsider.email, 'tenant_id', v_course.tenant_id)::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_cnt FROM gw_media_library WHERE id = v_orig;
  ASSERT v_cnt = 0, 'revoked share must remove access';
  RESET ROLE;

  -- Forged self-share (privilege-escalation regression): RLS blocks the
  -- outsider from inserting a share row owned by someone else, but
  -- media_item_shares_owner_all lets them insert one owned by THEMSELVES,
  -- pointed at the victim's private original. Without the owner_user_id =
  -- uploaded_by binding on media_library_item_shared_select, this alone
  -- would grant read access to any discoverable media_id.
  -- (The earlier legitimate fixture share already claimed the (v_orig,
  -- outsider-email) unique key and was revoked above; clear it first so
  -- this insert isn't a leftover-revoked-row false negative.)
  DELETE FROM gw_media_item_shares WHERE media_id = v_orig AND invited_email = lower(v_outsider.email);
  INSERT INTO gw_media_item_shares (media_id, owner_user_id, invited_email, tenant_id)
  VALUES (v_orig, v_outsider.user_id, v_outsider.email, v_course.tenant_id);

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_outsider.user_id, 'role', 'authenticated',
                      'email', v_outsider.email, 'tenant_id', v_course.tenant_id)::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_cnt FROM gw_media_library WHERE id = v_orig;
  ASSERT v_cnt = 0, 'forged self-owned share on someone else''s row must grant nothing';
  RESET ROLE;
END $$;

ROLLBACK;
