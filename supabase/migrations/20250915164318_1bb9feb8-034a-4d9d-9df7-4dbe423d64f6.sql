-- Enable RLS and add permissive policies for live poll participation

-- Ensure RLS is enabled on poll responses
ALTER TABLE IF EXISTS public.mus240_poll_responses ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including unauthenticated) to submit a response while the poll is active/live
DROP POLICY IF EXISTS "Public can submit responses for live polls" ON public.mus240_poll_responses;
CREATE POLICY "Public can submit responses for live polls"
ON public.mus240_poll_responses
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.mus240_polls p
    WHERE p.id = mus240_poll_responses.poll_id
      AND p.is_active = true
      AND COALESCE(p.is_live_session, true) = true
  )
);

-- Allow anyone to read responses for active polls (needed for live results)
DROP POLICY IF EXISTS "Public can read responses for active polls" ON public.mus240_poll_responses;
CREATE POLICY "Public can read responses for active polls"
ON public.mus240_poll_responses
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.mus240_polls p
    WHERE p.id = mus240_poll_responses.poll_id
      AND p.is_active = true
  )
);

-- Optionally, allow authenticated users to update their own responses during a live poll
DROP POLICY IF EXISTS "Authenticated can update their responses during live poll" ON public.mus240_poll_responses;
CREATE POLICY "Authenticated can update their responses during live poll"
ON public.mus240_poll_responses
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.mus240_polls p
    WHERE p.id = mus240_poll_responses.poll_id
      AND p.is_active = true
      AND COALESCE(p.is_live_session, true) = true
  )
);
