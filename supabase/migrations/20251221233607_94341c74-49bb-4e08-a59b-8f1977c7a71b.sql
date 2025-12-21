-- Create universal academy polls table
CREATE TABLE public.gw_academy_polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id TEXT NOT NULL,
  semester TEXT NOT NULL DEFAULT 'Spring 2026',
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_live_session BOOLEAN DEFAULT false,
  current_question_index INTEGER DEFAULT 0,
  show_results BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create poll responses table
CREATE TABLE public.gw_academy_poll_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.gw_academy_polls(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL,
  selected_option INTEGER NOT NULL,
  semester TEXT NOT NULL DEFAULT 'Spring 2026',
  response_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(poll_id, student_id, question_index)
);

-- Enable RLS
ALTER TABLE public.gw_academy_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_academy_poll_responses ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_gw_academy_polls_course_semester ON public.gw_academy_polls(course_id, semester);
CREATE INDEX idx_gw_academy_polls_active ON public.gw_academy_polls(is_active) WHERE is_active = true;
CREATE INDEX idx_gw_academy_poll_responses_poll ON public.gw_academy_poll_responses(poll_id);
CREATE INDEX idx_gw_academy_poll_responses_student ON public.gw_academy_poll_responses(student_id);

-- RLS Policies for polls
CREATE POLICY "Anyone can view active polls" 
ON public.gw_academy_polls 
FOR SELECT 
USING (is_active = true OR auth.uid() = created_by);

CREATE POLICY "Admins can manage polls" 
ON public.gw_academy_polls 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- RLS Policies for responses
CREATE POLICY "Students can view their own responses" 
ON public.gw_academy_poll_responses 
FOR SELECT 
USING (student_id = auth.uid());

CREATE POLICY "Students can submit responses" 
ON public.gw_academy_poll_responses 
FOR INSERT 
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admins can view all responses" 
ON public.gw_academy_poll_responses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Enable realtime for live polls
ALTER PUBLICATION supabase_realtime ADD TABLE public.gw_academy_polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gw_academy_poll_responses;

-- Updated at trigger
CREATE TRIGGER update_gw_academy_polls_updated_at
BEFORE UPDATE ON public.gw_academy_polls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();