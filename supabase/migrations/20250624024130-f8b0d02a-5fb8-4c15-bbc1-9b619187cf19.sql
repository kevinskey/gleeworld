
-- Complete W9 system reset - clear all data and start fresh

-- First, delete all W9 form records from the database
DELETE FROM public.w9_forms;

-- Delete all W9 form files from storage
DELETE FROM storage.objects WHERE bucket_id = 'w9-forms';

-- Reset any sequences if they exist
-- This ensures clean IDs when new forms are created
SELECT setval(pg_get_serial_sequence('public.w9_forms', 'id'), 1, false);

-- Verify cleanup
SELECT COUNT(*) as remaining_w9_records FROM public.w9_forms;
SELECT COUNT(*) as remaining_w9_files FROM storage.objects WHERE bucket_id = 'w9-forms';
