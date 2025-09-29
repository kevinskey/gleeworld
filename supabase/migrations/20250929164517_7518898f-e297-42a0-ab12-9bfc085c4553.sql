-- Fix type mismatch: student_id is text but auth.uid() returns uuid
-- Remove enrollment requirements - any authenticated user can take polls

-- Polls table policies
ALTER TABLE public.mus240_polls ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start clean
DROP POLICY IF EXISTS "Enrolled students can view active polls" ON public.mus240_polls;
DROP POLICY IF EXISTS "Anyone can view active polls" ON public.mus240_polls;
DROP POLICY IF EXISTS "Instructors can manage polls" ON public.mus240_polls;
DROP POLICY IF EXISTS "Admins can manage polls" ON public.mus240_polls;
DROP POLICY IF EXISTS "Polls select active for authenticated" ON public.mus240_polls;
DROP POLICY IF EXISTS "Polls admin manage" ON public.mus240_polls;

-- Authenticated users can view active polls (no enrollment check)
CREATE POLICY "authenticated_view_active_polls"
ON public.mus240_polls
FOR SELECT
TO authenticated
USING (is_active = true);

-- Admins can manage polls
CREATE POLICY "admin_manage_polls"
ON public.mus240_polls
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles gp
    WHERE gp.user_id = auth.uid()
      AND (gp.is_admin = true OR gp.is_super_admin = true)
  )
);

-- Poll responses table policies
ALTER TABLE public.mus240_poll_responses ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Students can view their own poll responses" ON public.mus240_poll_responses;
DROP POLICY IF EXISTS "Students can insert their own poll responses" ON public.mus240_poll_responses;
DROP POLICY IF EXISTS "Students can update their own poll responses" ON public.mus240_poll_responses;
DROP POLICY IF EXISTS "Admins can view all poll responses" ON public.mus240_poll_responses;
DROP POLICY IF EXISTS "Admins can delete poll responses" ON public.mus240_poll_responses;
DROP POLICY IF EXISTS "mus240_poll_responses_insert" ON public.mus240_poll_responses;
DROP POLICY IF EXISTS "mus240_poll_responses_select" ON public.mus240_poll_responses;
DROP POLICY IF EXISTS "Enrolled students can submit poll responses" ON public.mus240_poll_responses;
DROP POLICY IF EXISTS "Students can view their own responses" ON public.mus240_poll_responses;
DROP POLICY IF EXISTS "Poll responses insert by authenticated" ON public.mus240_poll_responses;
DROP POLICY IF EXISTS "Poll responses update own" ON public.mus240_poll_responses;
DROP POLICY IF EXISTS "Poll responses select for active polls" ON public.mus240_poll_responses;
DROP POLICY IF EXISTS "Poll responses admin manage" ON public.mus240_poll_responses;

-- Any authenticated user can insert their own response (no enrollment check)
-- Convert UUID to text for comparison since student_id is text column
CREATE POLICY "authenticated_insert_responses"
ON public.mus240_poll_responses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = student_id);

-- Students can update their own responses
CREATE POLICY "authenticated_update_responses"
ON public.mus240_poll_responses
FOR UPDATE
TO authenticated
USING (auth.uid()::text = student_id);

-- Allow viewing responses for active polls to show live results
CREATE POLICY "view_responses_for_active_polls"
ON public.mus240_poll_responses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.mus240_polls p
    WHERE p.id = mus240_poll_responses.poll_id
      AND p.is_active = true
  )
);

-- Admin full access to responses
CREATE POLICY "admin_manage_responses"
ON public.mus240_poll_responses
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles gp
    WHERE gp.user_id = auth.uid()
      AND (gp.is_admin = true OR gp.is_super_admin = true)
  )
);