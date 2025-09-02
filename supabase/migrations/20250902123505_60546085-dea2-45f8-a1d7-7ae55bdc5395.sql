-- Deactivate the broken PDF resource since the file doesn't exist in storage
UPDATE mus240_resources 
SET is_active = false 
WHERE id = 'ed698972-f7f6-4dc6-977f-9398d118a2b3' 
AND url LIKE '%Introduction_to_African_American_Folk_Music%';