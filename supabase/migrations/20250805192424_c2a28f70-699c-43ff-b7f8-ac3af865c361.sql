-- Insert working audio tracks into audio_archive using default category
INSERT INTO public.audio_archive (title, artist_info, audio_url, is_public, duration_seconds, created_by) VALUES
('Glee World Radio! - Welcome', 'Spelman College Glee Club', 'https://actions.google.com/sounds/v1/alarms/medium_bell_ringing_near.ogg', true, 30, '00000000-0000-0000-0000-000000000001'),
('Classical Piece', 'Glee Club Ensemble', 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', true, 45, '00000000-0000-0000-0000-000000000001'),
('Harmony Session', 'Spelman Voices', 'https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg', true, 60, '00000000-0000-0000-0000-000000000001'),
('Live Performance', 'Glee Club Live', 'https://actions.google.com/sounds/v1/ambiences/forest_birds.ogg', true, 120, '00000000-0000-0000-0000-000000000001'),
('Holiday Special', 'Holiday Ensemble', 'https://actions.google.com/sounds/v1/water/water_drops.ogg', true, 90, '00000000-0000-0000-0000-000000000001');

-- Update radio state to use the first track
UPDATE public.radio_state 
SET 
  current_track_id = (SELECT id FROM public.audio_archive WHERE title = 'Glee World Radio! - Welcome' LIMIT 1),
  current_track_title = 'Glee World Radio! - Welcome',
  current_track_artist = 'Spelman College Glee Club',
  updated_at = now()
WHERE id = '00000000-0000-0000-0000-000000000001';