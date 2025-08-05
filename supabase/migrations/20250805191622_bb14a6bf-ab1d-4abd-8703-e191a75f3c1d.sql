-- Initialize radio state with a default track
UPDATE public.radio_state 
SET 
  current_track_id = (SELECT id FROM public.audio_archive WHERE is_public = true ORDER BY created_at DESC LIMIT 1),
  current_track_title = (SELECT title FROM public.audio_archive WHERE is_public = true ORDER BY created_at DESC LIMIT 1),
  current_track_artist = (SELECT COALESCE(artist_info, 'Glee Club') FROM public.audio_archive WHERE is_public = true ORDER BY created_at DESC LIMIT 1),
  playback_position_seconds = 0,
  updated_at = now()
WHERE id = '00000000-0000-0000-0000-000000000001';