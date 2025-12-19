-- Clear existing channels and add all AzuraCast stations
DELETE FROM gw_radio_channels;

INSERT INTO gw_radio_channels (name, description, stream_url, icon, color, sort_order, is_active, is_default) VALUES
  ('99th Annual Christmas Carol', 'Christmas Carol Concert recordings', 'https://radio.gleeworld.org/listen/99th_annual_christmas_carol/radio.mp3', 'Sparkles', '#dc2626', 1, true, false),
  ('Alumni and Archives', 'Historic recordings from alumni', 'https://radio.gleeworld.org/listen/alumni_and_archives/radio.mp3', 'Users', '#06b6d4', 2, true, false),
  ('Amaze and Inspire', 'Inspirational performances', 'https://radio.gleeworld.org/listen/amaze_and_inpire/radio.mp3', 'Sparkles', '#f59e0b', 3, true, false),
  ('Christmas', 'Holiday and Christmas music', 'https://radio.gleeworld.org/listen/christmas/radio.mp3', 'Sparkles', '#dc2626', 4, true, false),
  ('Conducting', 'Conducting practice tracks', 'https://radio.gleeworld.org/listen/conducting/radio.mp3', 'Music', '#3b82f6', 5, true, false),
  ('Exec Board', 'Executive Board announcements', 'https://radio.gleeworld.org/listen/exec_board/radio.mp3', 'Shield', '#ef4444', 6, true, false),
  ('Glee 1973', 'Historic 1973 recordings', 'https://radio.gleeworld.org/listen/glee_1973/radio.mp3', 'Radio', '#7BAFD4', 7, true, false),
  ('Glee World Radio', 'Main mix of all content', 'https://radio.gleeworld.org/listen/glee_world_radio/radio.mp3', 'Radio', '#7BAFD4', 8, true, true),
  ('Gospel', 'Gospel and spirituals', 'https://radio.gleeworld.org/listen/gospel/radio.mp3', 'Church', '#9333ea', 9, true, false),
  ('Hip Hop Mass', 'Hip Hop Mass performances', 'https://radio.gleeworld.org/listen/hip_hop_mass/radio.mp3', 'Disc', '#ec4899', 10, true, false),
  ('Interviews', 'Member and alumnae interviews', 'https://radio.gleeworld.org/listen/interviews/radio.mp3', 'Mic', '#8b5cf6', 11, true, false),
  ('Negro Spirituals', 'Traditional Negro Spirituals', 'https://radio.gleeworld.org/listen/negro_spirituals/radio.mp3', 'Church', '#7c3aed', 12, true, false),
  ('Rehearsals', 'Rehearsal recordings', 'https://radio.gleeworld.org/listen/rehearsals/radio.mp3', 'Clock', '#f59e0b', 13, true, false),
  ('Serenbe - WABE Emmy Nominated Film', 'Emmy nominated documentary', 'https://radio.gleeworld.org/listen/serenbe_-_wabe_emmy_nominated_film/radio.mp3', 'Film', '#6366f1', 14, true, false),
  ('Sisters in Song', 'Sisters in Song performances', 'https://radio.gleeworld.org/listen/sisters_in_song/radio.mp3', 'Heart', '#f472b6', 15, true, false),
  ('Specials - Live Events', 'Live event recordings', 'https://radio.gleeworld.org/listen/specials_-_live_events/radio.mp3', 'Star', '#fbbf24', 16, true, false),
  ('Survey of African American Music', 'African American music survey', 'https://radio.gleeworld.org/listen/survey_of_african_american_music/radio.mp3', 'Globe', '#10b981', 17, true, false),
  ('Tour Radio', 'Tour recordings and updates', 'https://radio.gleeworld.org/listen/tour_radio/radio.mp3', 'MapPin', '#3b82f6', 18, true, false);