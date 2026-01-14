-- Insert the 4 missing voice part channels
INSERT INTO gw_radio_channels (name, stream_url, sort_order, is_active, is_default)
VALUES 
  ('A1', 'https://radio.gleeworld.org/listen/a1/radio.mp3', 2, true, false),
  ('A2', 'https://radio.gleeworld.org/listen/a2/radio.mp3', 3, true, false),
  ('S1', 'https://radio.gleeworld.org/listen/s1/radio.mp3', 19, true, false),
  ('S2', 'https://radio.gleeworld.org/listen/s2/radio.mp3', 20, true, false);