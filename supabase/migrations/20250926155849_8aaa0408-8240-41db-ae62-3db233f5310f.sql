-- Create table for MUS 240 midterm exam submissions
CREATE TABLE public.mus240_midterm_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Part I: Short Identifications (4 out of 6 terms)
  selected_terms TEXT[] NOT NULL DEFAULT '{}',
  ring_shout_answer TEXT,
  field_holler_answer TEXT,
  negro_spiritual_answer TEXT,
  blues_answer TEXT,
  ragtime_answer TEXT,
  swing_answer TEXT,
  
  -- Part II: Listening Analysis (2 excerpts)
  excerpt_1_genre TEXT,
  excerpt_1_features TEXT,
  excerpt_1_context TEXT,
  excerpt_2_genre TEXT,
  excerpt_2_features TEXT,
  excerpt_2_context TEXT,
  
  -- Part III: Short Essay (1 of 3 questions)
  selected_essay_question INTEGER,
  essay_answer TEXT,
  
  -- Metadata
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  time_started TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_submitted BOOLEAN NOT NULL DEFAULT false,
  total_time_minutes INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.mus240_midterm_submissions ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own submissions" 
ON public.mus240_midterm_submissions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own submissions" 
ON public.mus240_midterm_submissions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own unsubmitted exams" 
ON public.mus240_midterm_submissions 
FOR UPDATE 
USING (auth.uid() = user_id AND is_submitted = false);

-- Admins can view all submissions
CREATE POLICY "Admins can view all submissions" 
ON public.mus240_midterm_submissions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE gw_profiles.user_id = auth.uid() 
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_mus240_midterm_submissions_updated_at
BEFORE UPDATE ON public.mus240_midterm_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_mus240_midterm_submissions_user_id ON public.mus240_midterm_submissions(user_id);
CREATE INDEX idx_mus240_midterm_submissions_submitted ON public.mus240_midterm_submissions(is_submitted);