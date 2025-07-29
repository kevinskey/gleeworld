-- Create table for meeting minutes
CREATE TABLE public.gw_meeting_minutes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  meeting_date DATE NOT NULL,
  meeting_type TEXT NOT NULL DEFAULT 'executive_board',
  attendees TEXT[] NOT NULL DEFAULT '{}',
  agenda_items TEXT[] NOT NULL DEFAULT '{}',
  discussion_points TEXT,
  action_items TEXT[] NOT NULL DEFAULT '{}',
  next_meeting_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'archived')),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.gw_meeting_minutes ENABLE ROW LEVEL SECURITY;

-- Create policies for meeting minutes
CREATE POLICY "Executive board members can view all meeting minutes" 
ON public.gw_meeting_minutes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  ) OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Executive board members can create meeting minutes" 
ON public.gw_meeting_minutes 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by AND
  (EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  ) OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  ))
);

CREATE POLICY "Executive board members can update meeting minutes" 
ON public.gw_meeting_minutes 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  ) OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Executive board members can delete meeting minutes" 
ON public.gw_meeting_minutes 
FOR DELETE 
USING (
  auth.uid() = created_by OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_gw_meeting_minutes_updated_at
  BEFORE UPDATE ON public.gw_meeting_minutes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column_v2();