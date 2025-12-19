-- Disable radio channels that don't exist on AzuraCast server (returning 404)
-- Based on edge function logs showing these mount points don't exist

UPDATE gw_radio_channels 
SET is_active = false 
WHERE stream_url IN (
  'https://radio.gleeworld.org/listen/99th_annual_christmas_carol/radio.mp3',
  'https://radio.gleeworld.org/listen/alumni_and_archives/radio.mp3',
  'https://radio.gleeworld.org/listen/exec_board/radio.mp3',
  'https://radio.gleeworld.org/listen/glee_1973/radio.mp3',
  'https://radio.gleeworld.org/listen/gospel/radio.mp3',
  'https://radio.gleeworld.org/listen/interviews/radio.mp3',
  'https://radio.gleeworld.org/listen/negro_spirituals/radio.mp3',
  'https://radio.gleeworld.org/listen/rehearsals/radio.mp3',
  'https://radio.gleeworld.org/listen/serenbe_-_wabe_emmy_nominated_film/radio.mp3',
  'https://radio.gleeworld.org/listen/specials_-_live_events/radio.mp3',
  'https://radio.gleeworld.org/listen/survey_of_african_american_music/radio.mp3',
  'https://radio.gleeworld.org/listen/tour_radio/radio.mp3'
);