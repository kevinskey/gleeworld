-- Update audio tracks with working sample audio URLs
UPDATE public.audio_archive 
SET audio_url = 'https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Kangaroo_MusiQue_-_The_Neverwritten_Role_Playing_Game.mp3'
WHERE id IN (
  SELECT id FROM public.audio_archive 
  ORDER BY created_at ASC 
  LIMIT 5
);