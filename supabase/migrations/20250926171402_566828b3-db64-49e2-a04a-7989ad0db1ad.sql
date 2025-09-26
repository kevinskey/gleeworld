-- Fix the UPDATE policy for mus240_midterm_submissions to allow submission
DROP POLICY IF EXISTS "Users can update their own unsubmitted exams" ON public.mus240_midterm_submissions;

-- Create new policy that allows users to update their submissions (including submission)
CREATE POLICY "Users can update their own submissions" 
ON public.mus240_midterm_submissions 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);