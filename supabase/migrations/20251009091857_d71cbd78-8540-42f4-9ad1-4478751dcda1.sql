-- Fix the RLS policy for midterm submissions to allow proper updates
-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "Students can update their own unsubmitted midterms" ON public.mus240_midterm_submissions;

-- Create a better policy that allows students to update their own submissions
CREATE POLICY "students_update_own_midterm"
  ON public.mus240_midterm_submissions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Ensure the storage bucket for course materials exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-materials',
  'course-materials',
  true,
  10485760,
  ARRAY['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'video/mp4', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Drop and recreate the storage policy
DROP POLICY IF EXISTS "Anyone can view course materials" ON storage.objects;
CREATE POLICY "Anyone can view course materials"
ON storage.objects
FOR SELECT
USING (bucket_id = 'course-materials');