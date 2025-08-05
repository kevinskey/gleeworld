-- Update radio state to use a working audio URL
UPDATE public.radio_state 
SET 
  current_track_id = (SELECT id FROM public.audio_archive WHERE title = 'Glee World Radio! - Welcome' LIMIT 1),
  current_track_title = 'Glee World Radio! - Welcome',
  current_track_artist = 'Spelman College Glee Club',
  updated_at = now()
WHERE id = '00000000-0000-0000-0000-000000000001';