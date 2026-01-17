-- Deactivate legacy (AzuraCast-era) radio channels so the header spinner only shows the single Radio.co station
UPDATE public.gw_radio_channels
SET is_active = false,
    updated_at = now()
WHERE is_default IS DISTINCT FROM true
  AND is_active = true;

-- Ensure the default channel is active
UPDATE public.gw_radio_channels
SET is_active = true,
    updated_at = now()
WHERE is_default = true;