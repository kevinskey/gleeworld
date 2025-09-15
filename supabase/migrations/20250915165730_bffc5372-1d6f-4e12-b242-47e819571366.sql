-- Fix RLS so students (including anonymous) can submit poll responses during live sessions
-- Drop overly restrictive or conflicting policy
DROP POLICY IF EXISTS "Authenticated users can view their own poll responses" ON public.mus240_poll_responses;

-- Ensure table has RLS enabled (noop if already enabled)
ALTER TABLE public.mus240_poll_responses ENABLE ROW LEVEL SECURITY;

-- Allow anyone (public, including anon) to INSERT responses for polls that are live and active
CREATE POLICY "Anyone can submit responses to active live polls"
ON public.mus240_poll_responses
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.mus240_polls p
    WHERE p.id = mus240_poll_responses.poll_id
      AND p.is_active = true
      AND COALESCE(p.is_live_session, false) = true
  )
);

-- Allow anyone to UPDATE their existing response during the live poll window
-- (Needed because the client uses upsert; this is constrained to live/active polls)
CREATE POLICY "Anyone can update responses during live polls"
ON public.mus240_poll_responses
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.mus240_polls p
    WHERE p.id = mus240_poll_responses.poll_id
      AND p.is_active = true
      AND COALESCE(p.is_live_session, false) = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.mus240_polls p
    WHERE p.id = mus240_poll_responses.poll_id
      AND p.is_active = true
      AND COALESCE(p.is_live_session, false) = true
  )
);

-- Allow anyone to SELECT responses for active live polls (so students can see live stats)
CREATE POLICY "Anyone can view responses for active live polls"
ON public.mus240_poll_responses
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.mus240_polls p
    WHERE p.id = mus240_poll_responses.poll_id
      AND p.is_active = true
      AND COALESCE(p.is_live_session, false) = true
  )
);

-- Keep existing admin policies (if present) to allow full oversight