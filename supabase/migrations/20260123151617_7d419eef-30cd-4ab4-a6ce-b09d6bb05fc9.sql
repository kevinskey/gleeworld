-- Add the uploaded files from storage to gw_media_library
DO $$
DECLARE
    r RECORD;
    folder_name TEXT;
    file_title TEXT;
    public_url TEXT;
BEGIN
    FOR r IN 
        SELECT name, metadata->>'mimetype' as mimetype, (metadata->>'size')::bigint as size
        FROM storage.objects 
        WHERE bucket_id = 'media-library' 
        AND name LIKE 'media/%Listening%'
        AND NOT EXISTS (
            SELECT 1 FROM gw_media_library WHERE file_path = storage.objects.name
        )
    LOOP
        -- Extract folder name (e.g., "Hip-Hop Listening" from "media/Hip-Hop Listening/filename.wav")
        folder_name := split_part(r.name, '/', 2);
        
        -- Create a meaningful title from filename
        file_title := regexp_replace(split_part(r.name, '/', 3), '^[0-9]+-[a-z0-9]+\.', '', 'i');
        file_title := regexp_replace(file_title, '\.wav$', '', 'i');
        IF file_title = '' OR file_title IS NULL THEN
            file_title := folder_name || ' Track';
        END IF;
        
        -- Build public URL
        public_url := 'https://oopmlreysjzuxzylyheb.supabase.co/storage/v1/object/public/media-library/' || r.name;
        
        INSERT INTO gw_media_library (
            file_path,
            file_url,
            file_type,
            file_size,
            title,
            bucket_id,
            category,
            tags
        ) VALUES (
            r.name,
            public_url,
            COALESCE(r.mimetype, 'audio/wav'),
            COALESCE(r.size, 0),
            folder_name || ' - ' || file_title,
            'media-library',
            folder_name,
            ARRAY['folder:' || folder_name]
        );
    END LOOP;
END $$;