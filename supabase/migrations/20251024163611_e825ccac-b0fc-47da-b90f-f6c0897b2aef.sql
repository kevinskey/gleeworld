-- Temporarily add a more permissive policy for testing to see if enrollment check is the issue
-- This will help us diagnose if the enrollment EXISTS check is failing

-- First, let's add a policy that allows any authenticated user to insert (for debugging)
CREATE POLICY "Debug: Any authenticated user can insert"
ON public.group_updates_mus240
FOR INSERT
WITH CHECK (auth.uid() = submitter_id);

-- We'll remove this after testing