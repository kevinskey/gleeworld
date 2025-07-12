-- Add image_url column to events table
ALTER TABLE events ADD COLUMN image_url TEXT;

-- Create storage bucket for event images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for event images
CREATE POLICY "Anyone can view event images"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-images');

CREATE POLICY "Authenticated users can upload event images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'event-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own event images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'event-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own event images"
ON storage.objects FOR DELETE
USING (bucket_id = 'event-images' AND auth.uid()::text = (storage.foldername(name))[1]);