-- Remove mock and test data from sheet music library
UPDATE gw_sheet_music 
SET is_archived = true 
WHERE title LIKE 'OSME - Sight reading practice%' 
   OR title IN ('xml test', 'xmltry', 'Young Gifted and Black')
   OR (title = 'Young Gifted and Black' AND composer IS NULL);