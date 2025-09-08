-- Fix RLS policies for MUS240 poll responses to allow students to save responses

-- Update the insert policy to include proper WITH CHECK condition
DROP POLICY IF EXISTS "Anyone can submit responses to active polls" ON public.mus240_poll_responses;

-- Create a proper insert policy that checks the poll is active and allows authenticated users
CREATE POLICY "Students can submit responses to active polls" 
ON public.mus240_poll_responses 
FOR INSERT 
TO public 
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.mus240_polls 
    WHERE id = mus240_poll_responses.poll_id 
    AND is_active = true
  )
);

-- Also update the select policy to allow students to see their own responses
DROP POLICY IF EXISTS "Admins can view all responses" ON public.mus240_poll_responses;

CREATE POLICY "Users can view responses" 
ON public.mus240_poll_responses 
FOR SELECT 
TO public 
USING (
  auth.uid() IS NOT NULL AND (
    -- Admins can see all responses
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    ) OR
    -- Students can see responses to polls they have access to
    EXISTS (
      SELECT 1 FROM public.mus240_polls 
      WHERE id = mus240_poll_responses.poll_id 
      AND is_active = true
    )
  )
);