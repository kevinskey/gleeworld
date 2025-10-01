-- Add RLS policies for mus240_midterm_submissions to allow grading

-- Allow instructors/admins to view all submissions
CREATE POLICY "Instructors can view all midterm submissions"
ON mus240_midterm_submissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Allow instructors/admins to update grades
CREATE POLICY "Instructors can update midterm grades"
ON mus240_midterm_submissions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Allow students to view their own submissions
CREATE POLICY "Students can view their own midterm submissions"
ON mus240_midterm_submissions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow students to insert their own submissions
CREATE POLICY "Students can create their own midterm submissions"
ON mus240_midterm_submissions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow students to update their own unsubmitted submissions
CREATE POLICY "Students can update their own unsubmitted midterms"
ON mus240_midterm_submissions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND is_submitted = false)
WITH CHECK (auth.uid() = user_id AND is_submitted = false);