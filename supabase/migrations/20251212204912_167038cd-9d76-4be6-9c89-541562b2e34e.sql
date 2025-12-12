-- Update the user-files bucket to allow files up to 150MB
UPDATE storage.buckets 
SET file_size_limit = 157286400  -- 150MB in bytes
WHERE id = 'user-files';

-- Also update other commonly used buckets for large audio/video files
UPDATE storage.buckets 
SET file_size_limit = 157286400
WHERE id IN ('audio-archive', 'quick-capture-media', 'course-materials');