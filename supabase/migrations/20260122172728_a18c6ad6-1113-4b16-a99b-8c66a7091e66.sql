-- Fix academy course badge links: change /glee-academy/ to /academy/
UPDATE academy_course_badges 
SET link_url = REPLACE(link_url, '/glee-academy/', '/academy/')
WHERE link_url LIKE '/glee-academy/%';