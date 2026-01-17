UPDATE public.gw_radio_channels 
SET stream_url = 'https://streamer.radio.co/sd0d2e77cf/listen' 
WHERE stream_url LIKE '%s2.radio.co%' OR stream_url LIKE '%streaming.radio.co%' OR stream_url LIKE '%radio.gleeworld.org%' OR is_default = true;