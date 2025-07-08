-- Fix RLS policies to prevent infinite recursion

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view events they created or are participants in" ON public.events;
DROP POLICY IF EXISTS "Users can view participants of events they created or participa" ON public.event_participants;
DROP POLICY IF EXISTS "Event creators can manage participants" ON public.event_participants;

-- Create simpler, non-recursive policies for events
CREATE POLICY "Users can view events they created" ON public.events
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Event leads can view their assigned events" ON public.events
  FOR SELECT USING (auth.uid() = event_lead_id);

CREATE POLICY "Admins can view all events" ON public.events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super-admin'))
  );

-- Fix event_participants policies if they exist
CREATE POLICY "Event creators can manage participants" ON public.event_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE id = event_participants.event_id 
      AND auth.uid() = created_by
    )
  );

CREATE POLICY "Users can view participants for events they created" ON public.event_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE id = event_participants.event_id 
      AND auth.uid() = created_by
    )
  );