-- Fix RLS policy for event creation to ensure it has proper with_check
DROP POLICY IF EXISTS "Authenticated users can create events" ON public.gw_events;

CREATE POLICY "Authenticated users can create events" 
ON public.gw_events 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() IS NOT NULL);