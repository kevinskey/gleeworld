UPDATE public.gw_radio_channels 
SET stream_url = 'https://s2.radio.co/sd0d2e77cf/listen' 
WHERE stream_url LIKE '%streamer.radio.co%' OR is_default = true;