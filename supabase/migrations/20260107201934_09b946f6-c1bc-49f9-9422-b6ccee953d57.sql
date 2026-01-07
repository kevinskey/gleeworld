-- Create class_notes table for instructor and student notes
CREATE TABLE public.class_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('instructor_only', 'all_students', 'private')),
  note_type TEXT NOT NULL DEFAULT 'personal' CHECK (note_type IN ('lecture', 'study', 'personal', 'resource')),
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.class_notes ENABLE ROW LEVEL SECURITY;

-- Index for faster queries
CREATE INDEX idx_class_notes_course_id ON public.class_notes(course_id);
CREATE INDEX idx_class_notes_user_id ON public.class_notes(user_id);

-- RLS Policies

-- Users can view their own notes
CREATE POLICY "Users can view own notes"
ON public.class_notes
FOR SELECT
USING (auth.uid() = user_id);

-- Users can view notes shared with all students (if enrolled or instructor)
CREATE POLICY "Users can view shared notes"
ON public.class_notes
FOR SELECT
USING (visibility = 'all_students');

-- Users can view instructor-only notes if they are admin/instructor
CREATE POLICY "Instructors can view instructor notes"
ON public.class_notes
FOR SELECT
USING (
  visibility = 'instructor_only' 
  AND EXISTS (
    SELECT 1 FROM public.app_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'superadmin', 'instructor')
    AND is_active = true
  )
);

-- Users can insert their own notes
CREATE POLICY "Users can insert own notes"
ON public.class_notes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own notes
CREATE POLICY "Users can update own notes"
ON public.class_notes
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notes
CREATE POLICY "Users can delete own notes"
ON public.class_notes
FOR DELETE
USING (auth.uid() = user_id);

-- Create storage bucket for class notes files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'class-notes',
  'class-notes',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'audio/mpeg', 'audio/wav']
);

-- Storage policies for class-notes bucket
CREATE POLICY "Users can upload their own notes"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'class-notes' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own notes files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'class-notes' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own notes files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'class-notes' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Trigger to update updated_at
CREATE TRIGGER update_class_notes_updated_at
BEFORE UPDATE ON public.class_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();