-- Create public bucket for audition videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'children-go-auditions',
  'children-go-auditions',
  true,
  104857600, -- 100MB limit
  ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']
);

-- Create table to track audition submissions
CREATE TABLE public.children_go_auditions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name TEXT NOT NULL,
  email TEXT NOT NULL,
  video_url TEXT NOT NULL,
  video_path TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved BOOLEAN DEFAULT false,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.children_go_auditions ENABLE ROW LEVEL SECURITY;

-- Public can insert their own submissions
CREATE POLICY "Anyone can submit auditions"
ON public.children_go_auditions
FOR INSERT
WITH CHECK (true);

-- Public can view approved auditions
CREATE POLICY "Anyone can view approved auditions"
ON public.children_go_auditions
FOR SELECT
USING (approved = true);

-- Admins can view all
CREATE POLICY "Admins can view all auditions"
ON public.children_go_auditions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  )
);

-- Admins can update
CREATE POLICY "Admins can update auditions"
ON public.children_go_auditions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  )
);

-- Storage policies for public bucket
CREATE POLICY "Anyone can upload audition videos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'children-go-auditions');

CREATE POLICY "Anyone can view audition videos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'children-go-auditions');

-- Create index for faster queries
CREATE INDEX idx_children_go_auditions_approved ON public.children_go_auditions(approved);
CREATE INDEX idx_children_go_auditions_submitted_at ON public.children_go_auditions(submitted_at DESC);