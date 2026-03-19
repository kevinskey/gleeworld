INSERT INTO storage.buckets (id, name, public) VALUES ('africa-2026', 'africa-2026', true);

CREATE POLICY "Public read access for africa-2026"
ON storage.objects FOR SELECT
USING (bucket_id = 'africa-2026');

CREATE POLICY "Authenticated users can upload to africa-2026"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'africa-2026');

CREATE POLICY "Authenticated users can update africa-2026"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'africa-2026');

CREATE POLICY "Authenticated users can delete from africa-2026"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'africa-2026');