-- Update audio tracks with working sample audio URLs that are accessible
UPDATE public.audio_archive 
SET audio_url = CASE 
  WHEN title = 'Glee World Radio! - Welcome' THEN 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
  WHEN title = 'Classical Warm-up' THEN 'https://actions.google.com/sounds/v1/alarms/bugle_tune.ogg'
  WHEN title = 'Gospel Harmony Performance' THEN 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg'
  WHEN title = 'Historical Glee Club Recording' THEN 'https://actions.google.com/sounds/v1/ambiences/stream.ogg'
  WHEN title = 'Alumni Memory Interview' THEN 'https://actions.google.com/sounds/v1/alarms/analog_watch_alarm.ogg'
  ELSE audio_url
END
WHERE is_public = true;