
-- Delete all existing W9 form records from the database
DELETE FROM public.w9_forms;

-- Delete all objects from the W9 forms storage bucket
DELETE FROM storage.objects WHERE bucket_id = 'w9-forms';

-- Reset the W9 forms count to 0 by clearing all data
-- This will ensure no orphaned references remain
