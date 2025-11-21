-- Enable RLS on test-related tables
ALTER TABLE glee_academy_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_answer_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_answers ENABLE ROW LEVEL SECURITY;

-- Policies for glee_academy_tests
CREATE POLICY "Anyone can view published tests"
ON glee_academy_tests
FOR SELECT
TO authenticated
USING (is_published = true);

CREATE POLICY "Admins and TAs can view all tests for their course"
ON glee_academy_tests
FOR SELECT
TO authenticated
USING (
  is_admin_user(auth.uid()) OR
  is_course_ta(auth.uid(), course_id)
);

CREATE POLICY "Admins and TAs can create tests"
ON glee_academy_tests
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin_user(auth.uid()) OR
  is_course_ta(auth.uid(), course_id)
);

CREATE POLICY "Admins and TAs can update tests"
ON glee_academy_tests
FOR UPDATE
TO authenticated
USING (
  is_admin_user(auth.uid()) OR
  is_course_ta(auth.uid(), course_id)
);

CREATE POLICY "Admins and TAs can delete tests"
ON glee_academy_tests
FOR DELETE
TO authenticated
USING (
  is_admin_user(auth.uid()) OR
  is_course_ta(auth.uid(), course_id)
);

-- Policies for test_questions
CREATE POLICY "Anyone can view questions for published tests"
ON test_questions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM glee_academy_tests
    WHERE glee_academy_tests.id = test_questions.test_id
    AND is_published = true
  )
);

CREATE POLICY "Admins and TAs can manage questions"
ON test_questions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM glee_academy_tests
    WHERE glee_academy_tests.id = test_questions.test_id
    AND (
      is_admin_user(auth.uid()) OR
      is_course_ta(auth.uid(), course_id)
    )
  )
);

-- Policies for test_answer_options
CREATE POLICY "Anyone can view options for published tests"
ON test_answer_options
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM test_questions
    JOIN glee_academy_tests ON glee_academy_tests.id = test_questions.test_id
    WHERE test_questions.id = test_answer_options.question_id
    AND glee_academy_tests.is_published = true
  )
);

CREATE POLICY "Admins and TAs can manage options"
ON test_answer_options
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM test_questions
    JOIN glee_academy_tests ON glee_academy_tests.id = test_questions.test_id
    WHERE test_questions.id = test_answer_options.question_id
    AND (
      is_admin_user(auth.uid()) OR
      is_course_ta(auth.uid(), glee_academy_tests.course_id)
    )
  )
);

-- Policies for test_submissions
CREATE POLICY "Students can view their own submissions"
ON test_submissions
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "Students can create their own submissions"
ON test_submissions
FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admins and TAs can view all submissions"
ON test_submissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM glee_academy_tests
    WHERE glee_academy_tests.id = test_submissions.test_id
    AND (
      is_admin_user(auth.uid()) OR
      is_course_ta(auth.uid(), course_id)
    )
  )
);

-- Policies for test_answers
CREATE POLICY "Students can view their own answers"
ON test_answers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM test_submissions
    WHERE test_submissions.id = test_answers.submission_id
    AND test_submissions.student_id = auth.uid()
  )
);

CREATE POLICY "Students can create their own answers"
ON test_answers
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM test_submissions
    WHERE test_submissions.id = test_answers.submission_id
    AND test_submissions.student_id = auth.uid()
  )
);

CREATE POLICY "Admins and TAs can view all answers"
ON test_answers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM test_submissions
    JOIN glee_academy_tests ON glee_academy_tests.id = test_submissions.test_id
    WHERE test_submissions.id = test_answers.submission_id
    AND (
      is_admin_user(auth.uid()) OR
      is_course_ta(auth.uid(), glee_academy_tests.course_id)
    )
  )
);