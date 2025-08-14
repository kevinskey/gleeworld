-- Fix existing appointments with correct timestamps
-- Chloe Bennett: 2:30 PM EST on August 15th = 19:30 UTC
UPDATE gw_appointments 
SET appointment_date = '2025-08-15 19:30:00+00'
WHERE id = '57666f50-9f11-40ba-99f6-11ed93b6bd26' 
AND client_name = 'chloe bennett';

-- Taylor Wells: 11:30 AM EST on August 16th = 16:30 UTC  
UPDATE gw_appointments 
SET appointment_date = '2025-08-16 16:30:00+00'
WHERE id = '3e3efe1a-a50e-47a5-a29f-0c45c3d02eaa' 
AND client_name = 'Taylor Wells';