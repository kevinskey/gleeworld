-- Drop and recreate the context_type check constraint to include 'session_attendance'
ALTER TABLE gw_attendance_qr_codes 
DROP CONSTRAINT IF EXISTS gw_attendance_qr_codes_context_type_check;

ALTER TABLE gw_attendance_qr_codes 
ADD CONSTRAINT gw_attendance_qr_codes_context_type_check 
CHECK (context_type = ANY (ARRAY['event', 'course', 'assignment', 'general', 'session_attendance']));