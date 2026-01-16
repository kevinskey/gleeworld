-- Publish the latest version of the Shadow Responsibilities appendix
UPDATE handbook_appendices 
SET is_published = true 
WHERE slug = 'appendix-d-shadowing' 
AND course_id = 'MUS070' 
AND version = 6;