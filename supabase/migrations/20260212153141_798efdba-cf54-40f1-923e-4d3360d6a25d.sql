
-- RLS: Students can update their own submissions for revision (ai_graded status, revision_count = 0)
CREATE POLICY "Students can revise ai_graded assignment submissions"
ON gw_assignment_submissions
FOR UPDATE
USING (
  auth.uid() = user_id
  AND status = 'ai_graded'
  AND revision_count = 0
)
WITH CHECK (
  auth.uid() = user_id
  AND revision_count <= 1
);

CREATE POLICY "Students can revise ai_graded course submissions"
ON gw_course_submissions
FOR UPDATE
USING (
  auth.uid() = student_id
  AND status = 'ai_graded'
  AND revision_count = 0
)
WITH CHECK (
  auth.uid() = student_id
  AND revision_count <= 1
);
