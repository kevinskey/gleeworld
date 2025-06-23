
-- Create storage policy for signed contracts bucket (if not exists)
DO $$
BEGIN
    -- Check if policies exist and create them if they don't
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Anyone can view signed contracts'
    ) THEN
        CREATE POLICY "Anyone can view signed contracts" 
        ON storage.objects 
        FOR SELECT 
        USING (bucket_id = 'signed-contracts');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Anyone can upload signed contracts'
    ) THEN
        CREATE POLICY "Anyone can upload signed contracts" 
        ON storage.objects 
        FOR INSERT 
        WITH CHECK (bucket_id = 'signed-contracts');
    END IF;
END
$$;
