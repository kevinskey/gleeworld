-- Insert sample audio tracks for the radio player
INSERT INTO public.audio_archive (
  title, 
  artist_info, 
  audio_url, 
  category, 
  is_public, 
  duration_seconds,
  description
) VALUES 
(
  'Glee World Radio! - Welcome',
  'Spelman College Glee Club',
  'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
  'announcement',
  true,
  10,
  'Welcome message for Glee Radio listeners'
),
(
  'Classical Warm-up',
  'Glee Club Ensemble',
  'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', 
  'performance',
  true,
  180,
  'Classical vocal warm-up exercises'
),
(
  'Gospel Harmony',
  'Spelman Glee Club Alumni',
  'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
  'performance', 
  true,
  240,
  'Traditional gospel harmony piece'
),
(
  'Spiritual Reflection',
  'Current Members',
  'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
  'spiritual',
  true,
  200,
  'Spiritual and reflective musical piece'
),
(
  'Alumni Memory',
  'Class of 1995',
  'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
  'alumni_story',
  true,
  300,
  'Alumni sharing memories from their time in Glee Club'
);