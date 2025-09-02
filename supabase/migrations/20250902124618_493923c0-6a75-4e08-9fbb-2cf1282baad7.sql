-- Fix the Slave Songs PDF URL to point to the correct file
-- Disable RLS temporarily to fix this data issue
ALTER TABLE mus240_resources DISABLE ROW LEVEL SECURITY;

UPDATE mus240_resources 
SET url = 'https://oopmlreysjzuxzylyheb.supabase.co/storage/v1/object/public/mus240-resources/slave_songs_of_the_united_states.pdf',
    file_path = 'slave_songs_of_the_united_states.pdf',
    file_name = 'slave_songs_of_the_united_states.pdf'
WHERE id = '667063ca-44f2-42fe-8005-4b0a30213c3b';

-- Re-enable RLS
ALTER TABLE mus240_resources ENABLE ROW LEVEL SECURITY;