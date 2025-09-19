-- Fix conflicting RLS policies for poll responses

-- Drop all existing policies for mus240_poll_responses
DROP POLICY IF EXISTS "Anyone can submit responses to active live polls" ON public.mus240_poll_responses;
DROP POLICY IF EXISTS "Public can submit responses for live polls" ON public.mus240_poll_responses;
DROP POLICY IF EXISTS "Anyone can update responses during live polls" ON public.mus240_poll_responses;
DROP POLICY IF EXISTS "Authenticated can update their responses during live poll" ON public.mus240_poll_responses;
DROP POLICY IF EXISTS "Anyone can view responses for active live polls" ON public.mus240_poll_responses;
DROP POLICY IF EXISTS "Public can read responses for active polls" ON public.mus240_poll_responses;
DROP POLICY IF EXISTS "mus240_poll_responses_update" ON public.mus240_poll_responses;
DROP POLICY IF EXISTS "mus240_poll_responses_select" ON public.mus240_poll_responses;

-- Create new simplified policies for poll responses

-- Allow authenticated users and anonymous users to insert responses to active polls
CREATE POLICY "Students can submit poll responses" 
ON public.mus240_poll_responses FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.mus240_polls p
    WHERE p.id = mus240_poll_responses.poll_id 
    AND p.is_active = true
  )
);

-- Allow users to update their own responses to active polls
CREATE POLICY "Students can update their poll responses" 
ON public.mus240_poll_responses FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.mus240_polls p
    WHERE p.id = mus240_poll_responses.poll_id 
    AND p.is_active = true
  )
  AND (
    (auth.uid() IS NOT NULL AND student_id = auth.uid()::text) OR 
    (auth.uid() IS NULL)  -- Allow anonymous updates
  )
);

-- Allow viewing responses for active polls
CREATE POLICY "Students can view poll responses" 
ON public.mus240_poll_responses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.mus240_polls p
    WHERE p.id = mus240_poll_responses.poll_id 
    AND p.is_active = true
  )
);

-- Instructors can manage all poll responses (keep existing policy)
CREATE POLICY "Instructors can manage all poll responses" 
ON public.mus240_poll_responses FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);