-- Delete the test appointment I created
DELETE FROM public.gw_appointments 
WHERE client_name = 'Test Student' 
AND appointment_type = 'audition';