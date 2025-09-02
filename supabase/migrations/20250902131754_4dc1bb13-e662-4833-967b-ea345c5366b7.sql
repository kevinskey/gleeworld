-- Reactivate the Jubilee Quartets resource and update the URL to a generic filename
-- In case the file was uploaded with a standard name
UPDATE mus240_resources 
SET is_active = true,
    url = 'https://oopmlreysjzuxzylyheb.supabase.co/storage/v1/object/public/mus240-resources/jubilee_quartets.pdf',
    file_path = 'jubilee_quartets.pdf',
    file_name = 'jubilee_quartets.pdf',
    description = REPLACE(COALESCE(description, ''), ' [Note: Original PDF file needs to be re-uploaded]', ''),
    updated_at = now()
WHERE title ILIKE '%jubilee%' AND is_active = false;