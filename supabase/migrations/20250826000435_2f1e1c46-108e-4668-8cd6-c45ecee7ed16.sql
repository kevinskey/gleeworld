-- Update the Stabat Mater record that's missing a PDF URL
UPDATE gw_sheet_music 
SET pdf_url = 'https://oopmlreysjzuxzylyheb.supabase.co/storage/v1/object/sign/sheet-music/pdfs/1755998698306-a44hhfmg049.pdf?token=placeholder'
WHERE title = 'Stabat Mater Original Score' 
AND composer = 'Giovanni Battista Pergolesi (1710 – 1736)' 
AND pdf_url IS NULL;