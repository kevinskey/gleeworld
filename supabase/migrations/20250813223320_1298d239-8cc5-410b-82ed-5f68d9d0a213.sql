-- Clean up remaining Kevin Johnson appointments
DELETE FROM gw_appointments 
WHERE client_name IN ('Kevin Johnson', 'jo') 
AND appointment_type = 'audition';