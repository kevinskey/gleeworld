-- Drop the restrictive policy that broke public event visibility
DROP POLICY IF EXISTS "Users can view their own events" ON public.gw_events;

-- Create a combined policy that allows:
-- 1. Anyone authenticated can see public events (is_public = true)
-- 2. Users can see their own private events (created_by = auth.uid())
CREATE POLICY "Users can view public events and their own events"
ON public.gw_events
FOR SELECT
TO authenticated
USING (is_public = true OR created_by = auth.uid());