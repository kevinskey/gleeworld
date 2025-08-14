-- Fix Ke'Asia Mathis appointment: 3:00 PM EST on August 15th = 20:00 UTC
UPDATE gw_appointments 
SET appointment_date = '2025-08-15 20:00:00+00'
WHERE id = '65f7b76e-5fd6-46c6-bb69-91ab257eea44' 
AND client_name = 'Ke''Asia Mathis';