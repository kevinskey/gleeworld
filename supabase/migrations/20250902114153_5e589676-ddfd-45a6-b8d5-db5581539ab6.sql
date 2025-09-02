-- Update the MUS 240 resource to use the correct Supabase storage URL
UPDATE mus240_resources 
SET 
  url = 'https://oopmlreysjzuxzylyheb.supabase.co/storage/v1/object/public/mus240-resources/slave_songs_of_the_united_states.pdf',
  updated_at = now()
WHERE title = '100 Slave Songs of the United States';