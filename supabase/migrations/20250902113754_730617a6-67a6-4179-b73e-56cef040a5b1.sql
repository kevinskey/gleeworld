-- Update the MUS 240 resource to point to the new file location
UPDATE mus240_resources 
SET 
  url = 'https://system.gleeworld.org/storage/v1/object/public/mus240-resources/slave_songs_of_the_united_states.pdf',
  file_path = 'slave_songs_of_the_united_states.pdf',
  file_name = 'slave_songs_of_the_united_states.pdf',
  updated_at = now()
WHERE file_name = 'slavesongsofunit00alle.pdf' OR title = '100 Slave Songs of the United States';