-- Create tree lighting survey responses table
CREATE TABLE public.tree_lighting_survey_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  attended BOOLEAN NOT NULL,
  enjoyed_most TEXT,
  song_order TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.tree_lighting_survey_responses ENABLE ROW LEVEL SECURITY;

-- Users can view their own responses
CREATE POLICY "Users can view their own survey responses"
ON public.tree_lighting_survey_responses
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own responses
CREATE POLICY "Users can insert their own survey responses"
ON public.tree_lighting_survey_responses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own responses
CREATE POLICY "Users can update their own survey responses"
ON public.tree_lighting_survey_responses
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all responses
CREATE POLICY "Admins can view all survey responses"
ON public.tree_lighting_survey_responses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true)
  )
);