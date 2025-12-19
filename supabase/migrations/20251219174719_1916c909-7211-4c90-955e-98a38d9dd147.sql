-- Disable "Sisters in Song" station as the mount point doesn't exist on AzuraCast (returns 404)
UPDATE gw_radio_channels 
SET is_active = false 
WHERE name = 'Sisters in Song';