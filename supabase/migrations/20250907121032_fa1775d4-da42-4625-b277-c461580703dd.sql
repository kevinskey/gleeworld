-- Check if the INSERT policy for media-library already exists
DO $$
BEGIN
    -- Create INSERT policy for media-library bucket only if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Allow authenticated users to insert media files'
    ) THEN
        CREATE POLICY "Allow authenticated users to insert media files"
        ON storage.objects
        FOR INSERT 
        WITH CHECK (
          bucket_id = 'media-library' 
          AND auth.uid() IS NOT NULL
        );
    END IF;
END $$;