-- Make AI-generated sight reading exercises public for student practice
UPDATE gw_sheet_music 
SET is_public = true, 
    is_archived = false
WHERE composer = 'AI Generated' 
  AND xml_content IS NOT NULL
  AND title LIKE 'Sight Reading Exercise%';