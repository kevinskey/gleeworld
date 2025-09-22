-- Fix RLS policies for mus240_poll_responses to allow enrolled students to submit responses

-- Update the INSERT policy to allow enrolled students to submit poll responses
DROP POLICY IF EXISTS "Students can submit poll responses" ON mus240_poll_responses;
CREATE POLICY "Students can submit poll responses" ON mus240_poll_responses
FOR INSERT 
WITH CHECK (
  -- Allow if poll is active and user is enrolled in MUS240 for Fall 2025 OR is admin
  EXISTS (
    SELECT 1 FROM mus240_polls p
    WHERE p.id = poll_id AND p.is_active = true
  ) AND (
    -- Allow enrolled students
    EXISTS (
      SELECT 1 FROM mus240_enrollments 
      WHERE student_id = auth.uid() 
      AND enrollment_status = 'enrolled'
      AND semester = 'Fall 2025'
    ) 
    OR 
    -- Allow admins
    EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
    OR
    -- Allow anonymous users (for guest participation)
    auth.uid() IS NULL
  )
);

-- Update the UPDATE policy to be more permissive for enrolled students
DROP POLICY IF EXISTS "Students can update their poll responses" ON mus240_poll_responses;
CREATE POLICY "Students can update their poll responses" ON mus240_poll_responses
FOR UPDATE 
USING (
  -- Allow if poll is active and either:
  -- 1. User is the owner of the response (authenticated users)
  -- 2. User is admin
  -- 3. User is anonymous (for guest updates)
  EXISTS (
    SELECT 1 FROM mus240_polls p
    WHERE p.id = poll_id AND p.is_active = true
  ) AND (
    -- Authenticated user owns this response and is enrolled
    (auth.uid() IS NOT NULL AND student_id = auth.uid()::text AND
     EXISTS (
       SELECT 1 FROM mus240_enrollments 
       WHERE student_id = auth.uid() 
       AND enrollment_status = 'enrolled'
       AND semester = 'Fall 2025'
     )
    )
    OR 
    -- Admin can update any response
    EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
    OR
    -- Anonymous users can update their own responses
    auth.uid() IS NULL
  )
);

-- Update SELECT policy to allow enrolled students to view responses
DROP POLICY IF EXISTS "Students can view poll responses" ON mus240_poll_responses;
CREATE POLICY "Students can view poll responses" ON mus240_poll_responses
FOR SELECT 
USING (
  -- Allow if poll is active and user is enrolled in MUS240 for Fall 2025 OR is admin
  EXISTS (
    SELECT 1 FROM mus240_polls p
    WHERE p.id = poll_id AND p.is_active = true
  ) AND (
    -- Allow enrolled students
    EXISTS (
      SELECT 1 FROM mus240_enrollments 
      WHERE student_id = auth.uid() 
      AND enrollment_status = 'enrolled'
      AND semester = 'Fall 2025'
    ) 
    OR 
    -- Allow admins
    EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
    OR
    -- Allow anonymous users (for guest participation)
    auth.uid() IS NULL
  )
);