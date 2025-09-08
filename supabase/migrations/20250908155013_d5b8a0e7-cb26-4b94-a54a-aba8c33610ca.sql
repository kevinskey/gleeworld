-- Create mus240_poll_responses table
CREATE TABLE IF NOT EXISTS public.mus240_poll_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.mus240_polls(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.gw_profiles(user_id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL,
  selected_option TEXT NOT NULL,
  response_text TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(poll_id, student_id, question_index)
);

-- Enable RLS
ALTER TABLE public.mus240_poll_responses ENABLE ROW LEVEL SECURITY;

-- Allow students to view and manage their own responses
CREATE POLICY "Students can view their own poll responses"
ON public.mus240_poll_responses
FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own poll responses"
ON public.mus240_poll_responses
FOR INSERT
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own poll responses"
ON public.mus240_poll_responses
FOR UPDATE
USING (auth.uid() = student_id);

-- Allow admins and instructors to view all responses
CREATE POLICY "Admins can view all poll responses"
ON public.mus240_poll_responses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Allow admins to delete responses if needed
CREATE POLICY "Admins can delete poll responses"
ON public.mus240_poll_responses
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create updated_at trigger
CREATE TRIGGER update_mus240_poll_responses_updated_at
  BEFORE UPDATE ON public.mus240_poll_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();