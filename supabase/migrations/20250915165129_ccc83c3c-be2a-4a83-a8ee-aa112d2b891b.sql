-- Remove conflicting RLS policies that block anonymous poll submissions
DROP POLICY IF EXISTS "mus240_poll_responses_insert" ON public.mus240_poll_responses;
DROP POLICY IF EXISTS "Students can insert their own poll responses" ON public.mus240_poll_responses;
DROP POLICY IF EXISTS "Students can update their own poll responses" ON public.mus240_poll_responses;
DROP POLICY IF EXISTS "Students can view their own poll responses" ON public.mus240_poll_responses;

-- Add a new policy for authenticated users to view their own responses
CREATE POLICY "Authenticated users can view their own poll responses"
ON public.mus240_poll_responses
FOR SELECT
TO authenticated
USING (auth.uid() = student_id::uuid);