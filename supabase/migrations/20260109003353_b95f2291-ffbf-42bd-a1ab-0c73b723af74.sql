-- Create tour-documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('tour-documents', 'tour-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to view tour documents
CREATE POLICY "Anyone can view tour documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'tour-documents');

-- Allow admins and tour managers to upload tour documents
CREATE POLICY "Admins and tour managers can upload tour documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tour-documents' 
  AND auth.uid() IS NOT NULL
);

-- Allow admins and tour managers to delete tour documents
CREATE POLICY "Admins and tour managers can delete tour documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'tour-documents' 
  AND auth.uid() IS NOT NULL
);