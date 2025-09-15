-- Remove conflicting RLS policies that block anonymous poll submissions
DROP POLICY IF EXISTS "mus240_poll_responses_insert" ON public.mus240_poll_responses;
DROP POLICY IF EXISTS "Students can insert their own poll responses" ON public.mus240_poll_responses;
DROP POLICY IF EXISTS "Students can update their own poll responses" ON public.mus240_poll_responses;
DROP POLICY IF EXISTS "Students can view their own poll responses" ON public.mus240_poll_responses;

-- Keep the permissive policies that allow public participation in live polls
-- (These were created in the previous migration and should remain)
-- - "Public can submit responses for live polls" (INSERT for public)
-- - "Public can read responses for active polls" (SELECT for public) 
-- - "Authenticated can update their responses during live poll" (UPDATE for authenticated)

-- Add a new policy for authenticated users to view their own responses
CREATE POLICY "Authenticated users can view their own poll responses"
ON public.mus240_poll_responses
FOR SELECT
TO authenticated
USING (auth.uid()::text = student_id);