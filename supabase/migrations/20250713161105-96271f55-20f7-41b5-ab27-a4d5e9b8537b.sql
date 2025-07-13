-- Fix foreign key relationships for attendance system
-- Update gw_event_attendance to reference gw_profiles instead of auth.users

-- First, let's add a proper foreign key relationship
-- Drop the existing foreign key constraint to auth.users
ALTER TABLE gw_event_attendance 
DROP CONSTRAINT IF EXISTS gw_event_attendance_user_id_fkey;

-- Add foreign key to gw_profiles instead
ALTER TABLE gw_event_attendance 
ADD CONSTRAINT gw_event_attendance_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES gw_profiles(user_id) ON DELETE CASCADE;

-- Also fix the recorded_by field to reference gw_profiles
ALTER TABLE gw_event_attendance 
DROP CONSTRAINT IF EXISTS gw_event_attendance_recorded_by_fkey;

ALTER TABLE gw_event_attendance 
ADD CONSTRAINT gw_event_attendance_recorded_by_fkey 
FOREIGN KEY (recorded_by) REFERENCES gw_profiles(user_id) ON DELETE SET NULL;