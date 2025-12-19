-- Activate all radio channels
UPDATE gw_radio_channels SET is_active = true WHERE is_active = false;