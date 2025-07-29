-- Create the gw_meeting_minutes table if it doesn't exist properly
CREATE TABLE IF NOT EXISTS public.gw_meeting_minutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  meeting_date TIMESTAMP WITH TIME ZONE NOT NULL,
  meeting_type TEXT NOT NULL DEFAULT 'executive_board',
  attendees TEXT[] DEFAULT '{}',
  agenda_items TEXT[] DEFAULT '{}',
  discussion_points TEXT DEFAULT '',
  action_items TEXT[] DEFAULT '{}',
  next_meeting_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  google_doc_id TEXT,
  google_doc_url TEXT
);

-- Ensure RLS is enabled
ALTER TABLE public.gw_meeting_minutes ENABLE ROW LEVEL SECURITY;

-- Create updated timestamp trigger
CREATE OR REPLACE FUNCTION public.update_gw_meeting_minutes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS update_gw_meeting_minutes_updated_at ON public.gw_meeting_minutes;
CREATE TRIGGER update_gw_meeting_minutes_updated_at
  BEFORE UPDATE ON public.gw_meeting_minutes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gw_meeting_minutes_updated_at();