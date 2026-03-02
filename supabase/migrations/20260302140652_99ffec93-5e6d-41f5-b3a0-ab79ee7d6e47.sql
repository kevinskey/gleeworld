UPDATE quick_capture_media
SET course_id = 'a0000000-0000-0000-0000-000000000070'
WHERE file_type LIKE 'image/%'
  AND is_approved = true
  AND course_id IS NULL;