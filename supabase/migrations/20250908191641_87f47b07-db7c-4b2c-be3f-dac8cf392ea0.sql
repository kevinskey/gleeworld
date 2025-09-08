-- Fix RLS policies for MUS240 poll responses to allow students to save responses

-- First, drop all existing policies
DROP POLICY IF EXISTS "Students can submit responses to active polls" ON public.mus240_poll_responses;
DROP POLICY IF EXISTS "Users can view responses" ON public.mus240_poll_responses;
DROP POLICY IF EXISTS "Admins can view all responses" ON public.mus240_poll_responses;
DROP POLICY IF EXISTS "Anyone can submit responses to active polls" ON public.mus240_poll_responses;

-- Create a proper insert policy that allows authenticated users to submit responses
CREATE POLICY "mus240_poll_responses_insert" 
ON public.mus240_poll_responses 
FOR INSERT 
TO public 
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- Create a select policy that allows viewing responses
CREATE POLICY "mus240_poll_responses_select" 
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
    -- Allow viewing responses to active polls
    EXISTS (
      SELECT 1 FROM public.mus240_polls 
      WHERE id = mus240_poll_responses.poll_id 
      AND is_active = true
    )
  )
);