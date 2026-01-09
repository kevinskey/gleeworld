-- Create scheduled_meetings table for video meeting scheduling
CREATE TABLE public.scheduled_meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  room_name TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'))
);

-- Enable RLS
ALTER TABLE public.scheduled_meetings ENABLE ROW LEVEL SECURITY;

-- Users can view all scheduled meetings (for joining)
CREATE POLICY "Users can view scheduled meetings"
  ON public.scheduled_meetings
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Users can create their own meetings
CREATE POLICY "Users can create scheduled meetings"
  ON public.scheduled_meetings
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Users can update their own meetings
CREATE POLICY "Users can update their own meetings"
  ON public.scheduled_meetings
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Users can delete their own meetings
CREATE POLICY "Users can delete their own meetings"
  ON public.scheduled_meetings
  FOR DELETE
  USING (auth.uid() = created_by);

-- Create updated_at trigger
CREATE TRIGGER update_scheduled_meetings_updated_at
  BEFORE UPDATE ON public.scheduled_meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();