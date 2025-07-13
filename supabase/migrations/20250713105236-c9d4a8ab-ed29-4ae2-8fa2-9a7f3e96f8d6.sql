-- Delete the test sheet music records with example.com URLs
DELETE FROM gw_sheet_music 
WHERE pdf_url LIKE '%example.com%';