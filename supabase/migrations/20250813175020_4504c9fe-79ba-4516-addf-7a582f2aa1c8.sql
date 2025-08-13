-- Update audition time blocks to correct schedule
-- First, deactivate existing blocks
UPDATE audition_time_blocks SET is_active = false;

-- Insert correct audition time blocks
INSERT INTO audition_time_blocks (start_date, end_date, appointment_duration_minutes, is_active) VALUES
-- August 15, 2025: 2:30 PM - 4:30 PM
('2025-08-15 14:30:00', '2025-08-15 16:30:00', 5, true),
-- August 16, 2025: 11:00 AM - 1:00 PM  
('2025-08-16 11:00:00', '2025-08-16 13:00:00', 5, true);