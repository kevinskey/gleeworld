-- Add RLS policy for users to see their own events (including synced Google Calendar events)
CREATE POLICY "Users can view their own events"
ON public.gw_events
FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- Add index for faster user event lookups
CREATE INDEX IF NOT EXISTS idx_gw_events_created_by ON public.gw_events(created_by);