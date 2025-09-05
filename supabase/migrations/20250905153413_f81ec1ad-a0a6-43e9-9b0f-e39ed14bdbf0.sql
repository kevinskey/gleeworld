-- Create polls table
CREATE TABLE public.mus240_polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create poll responses table
CREATE TABLE public.mus240_poll_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.mus240_polls(id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL,
  selected_option INTEGER NOT NULL,
  student_id TEXT NOT NULL, -- Using text to allow anonymous participation
  response_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(poll_id, question_index, student_id)
);

-- Enable Row Level Security
ALTER TABLE public.mus240_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mus240_poll_responses ENABLE ROW LEVEL SECURITY;

-- Policies for polls
CREATE POLICY "Anyone can view active polls" 
ON public.mus240_polls 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage polls" 
ON public.mus240_polls 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Policies for poll responses
CREATE POLICY "Anyone can submit responses to active polls" 
ON public.mus240_poll_responses 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.mus240_polls 
    WHERE id = poll_id AND is_active = true
  )
);

CREATE POLICY "Admins can view all responses" 
ON public.mus240_poll_responses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create updated_at trigger for polls
CREATE TRIGGER update_mus240_polls_updated_at
  BEFORE UPDATE ON public.mus240_polls
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live results
ALTER TABLE public.mus240_polls REPLICA IDENTITY FULL;
ALTER TABLE public.mus240_poll_responses REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.mus240_polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mus240_poll_responses;