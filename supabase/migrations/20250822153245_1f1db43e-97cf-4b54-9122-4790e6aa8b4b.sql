-- Fix the duplicate policy error
DROP POLICY IF EXISTS "Students can update their own reading requirements" ON public.mus240_reading_requirements;

-- Create the correct policies for reading requirements
CREATE POLICY "Students can insert their own reading requirements" 
ON public.mus240_reading_requirements 
FOR INSERT 
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own reading requirements" 
ON public.mus240_reading_requirements 
FOR UPDATE 
USING (auth.uid() = student_id);