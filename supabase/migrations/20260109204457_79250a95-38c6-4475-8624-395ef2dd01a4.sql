-- Create meeting_notes table for storing collaborative meeting minutes
CREATE TABLE public.meeting_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_name TEXT NOT NULL,
  title TEXT,
  attendees TEXT[] DEFAULT '{}',
  agenda TEXT,
  discussion TEXT,
  decisions TEXT,
  action_items TEXT,
  additional_notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create index for room lookups
CREATE INDEX idx_meeting_notes_room_name ON public.meeting_notes(room_name);
CREATE INDEX idx_meeting_notes_created_at ON public.meeting_notes(created_at DESC);

-- Enable RLS
ALTER TABLE public.meeting_notes ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view meeting notes
CREATE POLICY "Authenticated users can view meeting notes"
ON public.meeting_notes
FOR SELECT
TO authenticated
USING (true);

-- Policy: Authenticated users can create meeting notes
CREATE POLICY "Authenticated users can create meeting notes"
ON public.meeting_notes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Authenticated users can update meeting notes
CREATE POLICY "Authenticated users can update meeting notes"
ON public.meeting_notes
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Enable realtime for collaborative editing
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_notes;

-- Create updated_at trigger
CREATE TRIGGER update_meeting_notes_updated_at
BEFORE UPDATE ON public.meeting_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();