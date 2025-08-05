-- Insert sample audio tracks for the radio player with correct categories
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
  'interview',
  true,
  10,
  'Welcome message for Glee Radio listeners'
),
(
  'Classical Warm-up',
  'Glee Club Ensemble',
  'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', 
  'rehearsal',
  true,
  180,
  'Classical vocal warm-up exercises'
),
(
  'Gospel Harmony Performance',
  'Spelman Glee Club Alumni',
  'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
  'performance', 
  true,
  240,
  'Traditional gospel harmony piece'
),
(
  'Historical Glee Club Recording',
  'Class of 1985',
  'https://www.soundjay.com/misc/sounds/bell-rining-05.wav',
  'historical',
  true,
  200,
  'Historical recording from the archives'
),
(
  'Alumni Memory Interview',
  'Class of 1995',
  'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
  'interview',
  true,
  300,
  'Alumni sharing memories from their time in Glee Club'
);