-- Insert working audio tracks into audio_archive without created_by constraint
INSERT INTO public.audio_archive (title, artist_info, audio_url, is_public, duration_seconds) VALUES
('Glee World Radio! - Welcome', 'Spelman College Glee Club', 'https://actions.google.com/sounds/v1/alarms/medium_bell_ringing_near.ogg', true, 30),
('Classical Piece', 'Glee Club Ensemble', 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', true, 45),
('Harmony Session', 'Spelman Voices', 'https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg', true, 60),
('Live Performance', 'Glee Club Live', 'https://actions.google.com/sounds/v1/ambiences/forest_birds.ogg', true, 120),
('Holiday Special', 'Holiday Ensemble', 'https://actions.google.com/sounds/v1/water/water_drops.ogg', true, 90);

-- Update radio state to use the first track
UPDATE public.radio_state 
SET 
  current_track_id = (SELECT id FROM public.audio_archive WHERE title = 'Glee World Radio! - Welcome' LIMIT 1),
  current_track_title = 'Glee World Radio! - Welcome',
  current_track_artist = 'Spelman College Glee Club',
  updated_at = now()
WHERE id = '00000000-0000-0000-0000-000000000001';