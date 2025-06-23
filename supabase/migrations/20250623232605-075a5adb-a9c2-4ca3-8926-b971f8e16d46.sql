
-- First, delete all existing W9 form records from the database
DELETE FROM public.w9_forms;

-- Delete all objects from any W9-related storage buckets
DELETE FROM storage.objects WHERE bucket_id LIKE '%w9%';
DELETE FROM storage.objects WHERE bucket_id LIKE '%W9%';

-- Now we can safely delete the buckets (keeping only 'w9-forms')
DELETE FROM storage.buckets WHERE name LIKE '%w9%' AND id != 'w9-forms';
DELETE FROM storage.buckets WHERE id LIKE '%w9%' AND id != 'w9-forms';
DELETE FROM storage.buckets WHERE name LIKE '%W9%' AND id != 'w9-forms';
DELETE FROM storage.buckets WHERE id LIKE '%W9%' AND id != 'w9-forms';
