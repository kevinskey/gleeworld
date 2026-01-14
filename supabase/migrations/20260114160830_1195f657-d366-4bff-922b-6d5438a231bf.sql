-- Create class session journals table for live in-class journaling
CREATE TABLE public.class_session_journals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id TEXT NOT NULL,
  session_id UUID, -- Optional link to a specific class session
  student_id UUID NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  word_count INTEGER DEFAULT 0,
  song_playing TEXT, -- Name of the song that was playing during journaling
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  close_time TIME DEFAULT '13:10:00', -- 1:10 PM default close time
  is_locked BOOLEAN DEFAULT false, -- Set to true when time expires
  instructor_feedback TEXT,
  grade NUMERIC(5,2),
  graded_at TIMESTAMP WITH TIME ZONE,
  graded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create class journal sessions table (instructor creates a session)
CREATE TABLE public.class_journal_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  song_title TEXT,
  song_artist TEXT,
  song_url TEXT, -- YouTube or audio URL
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIME NOT NULL DEFAULT CURRENT_TIME,
  close_time TIME NOT NULL DEFAULT '13:10:00',
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key from journals to sessions
ALTER TABLE public.class_session_journals 
ADD CONSTRAINT fk_journal_session 
FOREIGN KEY (session_id) REFERENCES public.class_journal_sessions(id) ON DELETE SET NULL;

-- Enable Row Level Security
ALTER TABLE public.class_session_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_journal_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for class_session_journals
CREATE POLICY "Students can view their own journals" 
ON public.class_session_journals 
FOR SELECT 
USING (auth.uid() = student_id);

CREATE POLICY "Students can create their own journals" 
ON public.class_session_journals 
FOR INSERT 
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own unlocked journals" 
ON public.class_session_journals 
FOR UPDATE 
USING (auth.uid() = student_id AND is_locked = false);

CREATE POLICY "Admins can view all journals" 
ON public.class_session_journals 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Admins can update journals for grading" 
ON public.class_session_journals 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

-- RLS Policies for class_journal_sessions
CREATE POLICY "Anyone can view active journal sessions" 
ON public.class_journal_sessions 
FOR SELECT 
USING (is_active = true OR EXISTS (
  SELECT 1 FROM public.gw_profiles 
  WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
));

CREATE POLICY "Admins can create journal sessions" 
ON public.class_journal_sessions 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Admins can update journal sessions" 
ON public.class_journal_sessions 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Admins can delete journal sessions" 
ON public.class_journal_sessions 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_class_journal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_class_session_journals_updated_at
BEFORE UPDATE ON public.class_session_journals
FOR EACH ROW
EXECUTE FUNCTION public.update_class_journal_updated_at();

CREATE TRIGGER update_class_journal_sessions_updated_at
BEFORE UPDATE ON public.class_journal_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_class_journal_updated_at();

-- Create storage bucket for journal attachments (if needed)
INSERT INTO storage.buckets (id, name, public)
VALUES ('class-journals', 'class-journals', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for journal attachments
CREATE POLICY "Students can upload their own journal attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'class-journals' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Students can view their own journal attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'class-journals' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all journal attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'class-journals' AND 
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);