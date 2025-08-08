-- Check if media-library bucket exists, create if not
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media-library', 
  'media-library', 
  true, 
  52428800, -- 50MB limit
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg', 'audio/flac', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  allowed_mime_types = ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg', 'audio/flac', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'application/pdf'],
  file_size_limit = 52428800;

-- Create storage policies for media-library bucket
CREATE POLICY "Allow authenticated users to upload media files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'media-library' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow public access to media files"
ON storage.objects FOR SELECT
USING (bucket_id = 'media-library');

CREATE POLICY "Allow authenticated users to update their media files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'media-library' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Allow authenticated users to delete their media files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'media-library' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add some sample MP3 entries to demonstrate the audio functionality
INSERT INTO public.gw_media_library (
  title, 
  description, 
  file_url, 
  file_path, 
  file_type, 
  file_size, 
  category, 
  uploaded_by, 
  is_public, 
  is_featured
) VALUES 
(
  'Spelman Glee Club - Alma Mater',
  'Traditional Spelman College Alma Mater performed by the Glee Club',
  'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3',
  'audio/spelman-alma-mater.mp3',
  'audio/mpeg',
  1024000,
  'performance',
  NULL,
  true,
  true
),
(
  'Glee Club Warm-up Exercise',
  'Vocal warm-up exercise for practice sessions',
  'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3',
  'audio/warm-up-exercise.mp3',
  'audio/mpeg',
  512000,
  'rehearsal',
  NULL,
  true,
  false
),
(
  'Centennial Celebration Recording',
  'Historic recording from the Glee Club centennial celebration',
  'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3',
  'audio/centennial-celebration.mp3',
  'audio/mpeg',
  2048000,
  'historic',
  NULL,
  true,
  true
);