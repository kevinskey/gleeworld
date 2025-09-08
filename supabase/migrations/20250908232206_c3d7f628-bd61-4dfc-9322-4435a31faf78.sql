-- Enable RLS and add policies for mus240_poll_responses table
ALTER TABLE mus240_poll_responses ENABLE ROW LEVEL SECURITY;

-- Students can insert their own responses
CREATE POLICY "Students can insert their own poll responses" 
ON mus240_poll_responses 
FOR INSERT 
WITH CHECK (auth.uid() = student_id);

-- Students can view their own responses
CREATE POLICY "Students can view their own poll responses" 
ON mus240_poll_responses 
FOR SELECT 
USING (auth.uid() = student_id);

-- Students can update their own responses (for live editing)
CREATE POLICY "Students can update their own poll responses" 
ON mus240_poll_responses 
FOR UPDATE 
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);

-- Instructors can view all responses
CREATE POLICY "Instructors can view all poll responses" 
ON mus240_poll_responses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Instructors can manage all responses
CREATE POLICY "Instructors can manage all poll responses" 
ON mus240_poll_responses 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);