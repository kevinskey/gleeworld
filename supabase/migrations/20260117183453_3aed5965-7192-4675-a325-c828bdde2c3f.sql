-- Set Amaze and Inspire as the default channel
UPDATE public.gw_radio_channels
SET is_default = true
WHERE name = 'Amaze and Inspire';