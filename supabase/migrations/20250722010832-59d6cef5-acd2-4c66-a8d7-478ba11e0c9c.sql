-- Create calendars table for organizing events
CREATE TABLE public.gw_calendars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  is_visible BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_calendars ENABLE ROW LEVEL SECURITY;

-- RLS policies for calendars
CREATE POLICY "Everyone can view calendars" 
ON public.gw_calendars 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage calendars" 
ON public.gw_calendars 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Add calendar_id to gw_events
ALTER TABLE public.gw_events 
ADD COLUMN calendar_id UUID REFERENCES public.gw_calendars(id);

-- Create default calendar
INSERT INTO public.gw_calendars (name, description, color, is_default, is_visible)
VALUES ('Default Calendar', 'Default calendar for all events', '#3b82f6', true, true);

-- Update existing events to use default calendar
UPDATE public.gw_events 
SET calendar_id = (SELECT id FROM public.gw_calendars WHERE is_default = true LIMIT 1)
WHERE calendar_id IS NULL;

-- Make calendar_id required for new events
ALTER TABLE public.gw_events 
ALTER COLUMN calendar_id SET NOT NULL;

-- Create trigger for updated_at
CREATE TRIGGER update_gw_calendars_updated_at
  BEFORE UPDATE ON public.gw_calendars
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();