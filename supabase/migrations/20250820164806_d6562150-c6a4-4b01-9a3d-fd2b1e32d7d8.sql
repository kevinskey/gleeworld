-- Create music fundamentals assignments table
CREATE TABLE public.music_fundamentals_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  assignment_type TEXT NOT NULL CHECK (assignment_type IN ('sight_singing', 'theory', 'composition', 'analysis')),
  due_date TIMESTAMP WITH TIME ZONE,
  max_score INTEGER DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create music fundamentals submissions table
CREATE TABLE public.music_fundamentals_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.music_fundamentals_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  submission_type TEXT NOT NULL CHECK (submission_type IN ('audio', 'pdf', 'musicxml', 'text')),
  file_url TEXT,
  file_name TEXT,
  content TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  score INTEGER,
  feedback TEXT,
  graded_by UUID,
  graded_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'needs_revision')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sight singing exercise recordings table
CREATE TABLE public.sight_singing_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  exercise_data JSONB NOT NULL, -- stores the generated musical exercise
  audio_url TEXT,
  score INTEGER,
  feedback TEXT,
  difficulty_level TEXT DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  key_signature TEXT,
  time_signature TEXT,
  tempo INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.music_fundamentals_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_fundamentals_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sight_singing_recordings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assignments
CREATE POLICY "Students can view active assignments" 
ON public.music_fundamentals_assignments 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Instructors can manage assignments" 
ON public.music_fundamentals_assignments 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR role IN ('instructor', 'admin'))
  )
);

-- RLS Policies for submissions
CREATE POLICY "Students can create their own submissions" 
ON public.music_fundamentals_submissions 
FOR INSERT 
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can view their own submissions" 
ON public.music_fundamentals_submissions 
FOR SELECT 
USING (auth.uid() = student_id);

CREATE POLICY "Students can update their ungraded submissions" 
ON public.music_fundamentals_submissions 
FOR UPDATE 
USING (auth.uid() = student_id AND status = 'submitted');

CREATE POLICY "Instructors can view and grade all submissions" 
ON public.music_fundamentals_submissions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR role IN ('instructor', 'admin'))
  )
);

-- RLS Policies for sight singing recordings
CREATE POLICY "Students can manage their own recordings" 
ON public.sight_singing_recordings 
FOR ALL 
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Instructors can view all recordings" 
ON public.sight_singing_recordings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR role IN ('instructor', 'admin'))
  )
);

-- Create storage bucket for music fundamentals files
INSERT INTO storage.buckets (id, name, public) VALUES ('music-fundamentals', 'music-fundamentals', false);

-- Storage policies
CREATE POLICY "Students can upload their own files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'music-fundamentals' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Students can view their own files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'music-fundamentals' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Instructors can view all music fundamentals files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'music-fundamentals' 
  AND EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR role IN ('instructor', 'admin'))
  )
);

-- Add triggers for updated_at
CREATE TRIGGER update_music_fundamentals_assignments_updated_at
  BEFORE UPDATE ON public.music_fundamentals_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_music_fundamentals_submissions_updated_at
  BEFORE UPDATE ON public.music_fundamentals_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sight_singing_recordings_updated_at
  BEFORE UPDATE ON public.sight_singing_recordings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();