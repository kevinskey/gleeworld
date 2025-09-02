-- Temporarily point Jubilee Quartets to the working PDF while the correct file is uploaded
UPDATE mus240_resources 
SET url = 'https://oopmlreysjzuxzylyheb.supabase.co/storage/v1/object/public/mus240-resources/slave_songs_of_the_united_states.pdf',
    file_path = 'slave_songs_of_the_united_states.pdf',
    file_name = 'slave_songs_of_the_united_states.pdf',
    description = COALESCE(description, '') || ' [Temporary: Using Slave Songs PDF until Jubilee Quartets is uploaded]',
    updated_at = now()
WHERE title ILIKE '%jubilee%';