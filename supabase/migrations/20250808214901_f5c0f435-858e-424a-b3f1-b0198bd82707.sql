-- Remove the mock MP3 entries that were added
DELETE FROM public.gw_media_library 
WHERE file_url = 'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3';