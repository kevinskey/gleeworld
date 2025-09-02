-- Deactivate the broken Slave Songs PDF resource since the file doesn't exist in storage
UPDATE mus240_resources 
SET is_active = false 
WHERE id = '84d66b43-f7f9-45c5-8b88-10521dfcfffe' 
AND title = '100 Slave Songs of the United States';