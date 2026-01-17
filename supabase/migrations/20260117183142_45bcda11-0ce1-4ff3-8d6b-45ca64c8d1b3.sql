-- Normalize radio channel stream URLs to the working Radio.co endpoint
UPDATE public.gw_radio_channels
SET stream_url = 'https://s5.radio.co/sd0d2e77cf/listen'
WHERE stream_url LIKE 'https://s%.radio.co/%/listen'
   OR stream_url LIKE 'https://streaming.radio.co/%/listen';