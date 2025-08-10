-- Create table to store generated sight-reading exercises
CREATE TABLE IF NOT EXISTS public.gw_sight_reading_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  key_signature TEXT,
  time_signature TEXT,
  measures INTEGER,
  tempo INTEGER,
  part_count INTEGER DEFAULT 1,
  voice_parts TEXT[] DEFAULT '{}',
  musicxml_url TEXT,
  pdf_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.gw_sight_reading_exercises ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own or public exercises"
ON public.gw_sight_reading_exercises
FOR SELECT
USING (owner_id = auth.uid() OR is_public = true);

CREATE POLICY "Users can insert their exercises"
ON public.gw_sight_reading_exercises
FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their exercises"
ON public.gw_sight_reading_exercises
FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their exercises"
ON public.gw_sight_reading_exercises
FOR DELETE
USING (owner_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_gwsre_owner_created_at
ON public.gw_sight_reading_exercises (owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gwsre_is_public_created_at
ON public.gw_sight_reading_exercises (is_public, created_at DESC);

-- Trigger to keep updated_at fresh
CREATE TRIGGER update_gw_sight_reading_exercises_updated_at
BEFORE UPDATE ON public.gw_sight_reading_exercises
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();