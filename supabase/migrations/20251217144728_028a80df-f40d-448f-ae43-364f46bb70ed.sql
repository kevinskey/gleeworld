-- Deactivate all providers except Dr. Kevin Phillip Johnson
UPDATE gw_service_providers 
SET is_active = false 
WHERE id != '92990a65-5382-469f-93f1-d56e6ee4d4f3';