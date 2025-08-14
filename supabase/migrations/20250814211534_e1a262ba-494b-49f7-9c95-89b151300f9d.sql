-- Create exercises table
CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  json_score JSONB NOT NULL,
  musicxml_url TEXT NOT NULL
);

-- Enable RLS on exercises
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- Create policy for exercises
CREATE POLICY "owner_rw_exercises" ON public.exercises
  FOR ALL USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- Create submissions table
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  bpm INTEGER NOT NULL,
  audio_url TEXT NOT NULL,
  overall NUMERIC NOT NULL,
  letter TEXT NOT NULL,
  metrics JSONB NOT NULL
);

-- Enable RLS on submissions
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Create policy for submissions
CREATE POLICY "owner_rw_submissions" ON public.submissions
  FOR ALL USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);