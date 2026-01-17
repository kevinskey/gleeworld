-- Update ALL radio channels to use the Radio.co stream URL
UPDATE public.gw_radio_channels 
SET stream_url = 'https://s5.radio.co/sd0d2e77cf/listen'
WHERE stream_url LIKE '%radio.gleeworld.org%' OR stream_url LIKE '%streaming.radio.co%';