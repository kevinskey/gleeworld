-- Create sight singing exercises table
CREATE TABLE public.sight_singing_exercises (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    key_signature TEXT NOT NULL,
    time_signature TEXT NOT NULL,
    tempo INTEGER NOT NULL DEFAULT 120,
    measures INTEGER NOT NULL DEFAULT 4,
    register TEXT NOT NULL CHECK (register IN ('soprano', 'alto', 'tenor', 'bass')),
    pitch_range_min TEXT NOT NULL,
    pitch_range_max TEXT NOT NULL,
    motion_types TEXT[] NOT NULL DEFAULT '{}',
    note_lengths TEXT[] NOT NULL DEFAULT '{}',
    difficulty_level INTEGER NOT NULL DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
    musicxml_content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recordings table
CREATE TABLE public.sight_singing_recordings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    exercise_id UUID REFERENCES public.sight_singing_exercises(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    audio_file_path TEXT NOT NULL,
    duration_seconds DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create evaluations table
CREATE TABLE public.sight_singing_evaluations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    recording_id UUID REFERENCES public.sight_singing_recordings(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES public.sight_singing_exercises(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    pitch_accuracy DECIMAL(5,2) NOT NULL DEFAULT 0,
    rhythm_accuracy DECIMAL(5,2) NOT NULL DEFAULT 0,
    per_measure_data JSONB NOT NULL DEFAULT '[]',
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create shared exercises table for public sharing
CREATE TABLE public.sight_singing_shares (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    exercise_id UUID REFERENCES public.sight_singing_exercises(id) ON DELETE CASCADE,
    recording_id UUID REFERENCES public.sight_singing_recordings(id) ON DELETE CASCADE,
    evaluation_id UUID REFERENCES public.sight_singing_evaluations(id) ON DELETE CASCADE,
    share_token TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    view_count INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.sight_singing_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sight_singing_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sight_singing_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sight_singing_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for exercises
CREATE POLICY "Users can view their own exercises" 
ON public.sight_singing_exercises 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own exercises" 
ON public.sight_singing_exercises 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exercises" 
ON public.sight_singing_exercises 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exercises" 
ON public.sight_singing_exercises 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for recordings
CREATE POLICY "Users can view their own recordings" 
ON public.sight_singing_recordings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recordings" 
ON public.sight_singing_recordings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recordings" 
ON public.sight_singing_recordings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recordings" 
ON public.sight_singing_recordings 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for evaluations
CREATE POLICY "Users can view their own evaluations" 
ON public.sight_singing_evaluations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own evaluations" 
ON public.sight_singing_evaluations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own evaluations" 
ON public.sight_singing_evaluations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own evaluations" 
ON public.sight_singing_evaluations 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for shares (public read access)
CREATE POLICY "Anyone can view active shares" 
ON public.sight_singing_shares 
FOR SELECT 
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Users can create shares for their exercises" 
ON public.sight_singing_shares 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own shares" 
ON public.sight_singing_shares 
FOR UPDATE 
USING (auth.uid() = created_by);

-- Create indexes for performance
CREATE INDEX idx_exercises_user_id ON public.sight_singing_exercises(user_id);
CREATE INDEX idx_recordings_exercise_id ON public.sight_singing_recordings(exercise_id);
CREATE INDEX idx_recordings_user_id ON public.sight_singing_recordings(user_id);
CREATE INDEX idx_evaluations_recording_id ON public.sight_singing_evaluations(recording_id);
CREATE INDEX idx_evaluations_user_id ON public.sight_singing_evaluations(user_id);
CREATE INDEX idx_shares_token ON public.sight_singing_shares(share_token);
CREATE INDEX idx_shares_active ON public.sight_singing_shares(is_active, expires_at);

-- Create updated_at triggers
CREATE TRIGGER update_sight_singing_exercises_updated_at
    BEFORE UPDATE ON public.sight_singing_exercises
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sight_singing_recordings_updated_at
    BEFORE UPDATE ON public.sight_singing_recordings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sight_singing_evaluations_updated_at
    BEFORE UPDATE ON public.sight_singing_evaluations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate share tokens
CREATE OR REPLACE FUNCTION public.generate_sight_singing_share_token()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN encode(digest(gen_random_bytes(32) || extract(epoch from now())::text, 'sha256'), 'base64');
END;
$$;