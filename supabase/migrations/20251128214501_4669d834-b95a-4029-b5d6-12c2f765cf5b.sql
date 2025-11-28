-- Create storage buckets for course resources
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('course-videos', 'course-videos', true, 524288000, ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']),
  ('course-audio', 'course-audio', true, 52428800, ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg']),
  ('course-documents', 'course-documents', true, 52428800, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'])
ON CONFLICT (id) DO NOTHING;

-- Create table for course video resources
CREATE TABLE IF NOT EXISTS public.course_video_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_type TEXT NOT NULL CHECK (video_type IN ('youtube', 'upload')),
  youtube_url TEXT,
  video_path TEXT,
  display_order INT DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create table for course audio resources
CREATE TABLE IF NOT EXISTS public.course_audio_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  audio_path TEXT NOT NULL,
  duration_seconds INT,
  display_order INT DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create table for course documents
CREATE TABLE IF NOT EXISTS public.course_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  document_path TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  category TEXT DEFAULT 'general' CHECK (category IN ('syllabus', 'handout', 'reading', 'general')),
  display_order INT DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.course_video_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_audio_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video resources
CREATE POLICY "Anyone can view published video resources"
  ON public.course_video_resources FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can manage video resources"
  ON public.course_video_resources FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE user_id = auth.uid()
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- RLS Policies for audio resources
CREATE POLICY "Anyone can view published audio resources"
  ON public.course_audio_resources FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can manage audio resources"
  ON public.course_audio_resources FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE user_id = auth.uid()
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- RLS Policies for documents
CREATE POLICY "Anyone can view published documents"
  ON public.course_documents FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can manage documents"
  ON public.course_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE user_id = auth.uid()
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Storage policies for course-videos bucket
CREATE POLICY "Anyone can view course videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'course-videos');

CREATE POLICY "Admins can upload course videos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'course-videos' AND
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE user_id = auth.uid()
      AND (is_admin = true OR is_super_admin = true)
    )
  );

CREATE POLICY "Admins can delete course videos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'course-videos' AND
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE user_id = auth.uid()
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Storage policies for course-audio bucket
CREATE POLICY "Anyone can view course audio"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'course-audio');

CREATE POLICY "Admins can upload course audio"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'course-audio' AND
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE user_id = auth.uid()
      AND (is_admin = true OR is_super_admin = true)
    )
  );

CREATE POLICY "Admins can delete course audio"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'course-audio' AND
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE user_id = auth.uid()
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Storage policies for course-documents bucket
CREATE POLICY "Anyone can view course documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'course-documents');

CREATE POLICY "Admins can upload course documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'course-documents' AND
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE user_id = auth.uid()
      AND (is_admin = true OR is_super_admin = true)
    )
  );

CREATE POLICY "Admins can delete course documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'course-documents' AND
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE user_id = auth.uid()
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_video_resources_course ON public.course_video_resources(course_id);
CREATE INDEX IF NOT EXISTS idx_audio_resources_course ON public.course_audio_resources(course_id);
CREATE INDEX IF NOT EXISTS idx_documents_course ON public.course_documents(course_id);

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_video_resources_updated_at BEFORE UPDATE ON public.course_video_resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audio_resources_updated_at BEFORE UPDATE ON public.course_audio_resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.course_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();