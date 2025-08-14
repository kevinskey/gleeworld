-- Fix the storage policy by properly casting UUID to text
DROP POLICY IF EXISTS "Users can update their own MusicXML files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own MusicXML files" ON storage.objects;

-- Recreate with proper casting
CREATE POLICY "Users can update their own MusicXML files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'musicxml-exercises' AND owner = auth.uid()::text);

CREATE POLICY "Users can delete their own MusicXML files"
ON storage.objects FOR DELETE
USING (bucket_id = 'musicxml-exercises' AND owner = auth.uid()::text);