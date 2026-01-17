-- Update default radio channels to use Radio.co stream URL
UPDATE public.gw_radio_channels 
SET stream_url = 'https://streaming.radio.co/sd0d2e77cf/listen'
WHERE is_default = true OR stream_url LIKE '%radio.gleeworld.org%';