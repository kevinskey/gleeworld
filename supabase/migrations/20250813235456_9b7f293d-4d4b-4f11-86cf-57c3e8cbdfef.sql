-- Populate the schedule UI with sample appointment data
-- Clear existing sample appointments to avoid duplicates
DELETE FROM gw_appointments WHERE client_name IN ('Dr. Sarah Johnson', 'Emily Chen', 'Marcus Williams', 'Jessica Taylor', 'David Brown', 'Ashley Miller', 'Kevin Adams', 'Maria Rodriguez', 'James Wilson', 'Rachel Green');

-- Insert realistic appointment sample data
INSERT INTO gw_appointments (
  title,
  client_name,
  client_email,
  client_phone,
  appointment_date,
  appointment_time,
  duration_minutes,
  appointment_type,
  status,
  description,
  notes,
  created_at,
  updated_at
) VALUES
  -- Today's appointments
  ('Voice Lesson - Dr. Sarah Johnson', 'Dr. Sarah Johnson', 'sarah.johnson@spelman.edu', '(404) 555-0101', 
   CURRENT_DATE, '14:30:00', 30, 'lesson', 'confirmed', 
   'Individual voice lesson focusing on classical technique', 'Experienced soprano, preparing for recital', NOW(), NOW()),
  
  ('Office Hours - Emily Chen', 'Emily Chen', 'emily.chen@students.spelman.edu', '(404) 555-0102', 
   CURRENT_DATE, '15:00:00', 20, 'office-hours', 'confirmed', 
   'Student advising session and course planning', 'Junior, music major', NOW(), NOW()),
  
  ('Audition - Marcus Williams', 'Marcus Williams', 'marcus.williams@students.spelman.edu', '(404) 555-0103', 
   CURRENT_DATE, '16:15:00', 15, 'audition', 'confirmed', 
   'New member audition for Glee Club', 'Transfer student, previous choir experience', NOW(), NOW()),
  
  ('Faculty Meeting - Jessica Taylor', 'Jessica Taylor', 'jessica.taylor@spelman.edu', '(404) 555-0104', 
   CURRENT_DATE, '17:00:00', 45, 'meeting', 'confirmed', 
   'Department planning meeting', 'End of semester preparations', NOW(), NOW()),

  -- Tomorrow's appointments
  ('Voice Lesson - David Brown', 'David Brown', 'david.brown@students.spelman.edu', '(404) 555-0105', 
   CURRENT_DATE + INTERVAL '1 day', '10:00:00', 30, 'lesson', 'confirmed', 
   'Individual voice lesson - alto development', 'Working on breath control and range', NOW(), NOW()),
  
  ('Audition - Ashley Miller', 'Ashley Miller', 'ashley.miller@students.spelman.edu', '(404) 555-0106', 
   CURRENT_DATE + INTERVAL '1 day', '11:30:00', 15, 'audition', 'pending', 
   'New member audition for Glee Club', 'Freshman with strong musical background', NOW(), NOW()),
  
  ('Group Coaching - Sectional', 'Kevin Adams', 'kevin.adams@students.spelman.edu', '(404) 555-0107', 
   CURRENT_DATE + INTERVAL '1 day', '14:00:00', 60, 'lesson', 'confirmed', 
   'Soprano section coaching for upcoming concert', 'Preparing for Winter Concert', NOW(), NOW()),

  -- This week's appointments
  ('Office Hours - Maria Rodriguez', 'Maria Rodriguez', 'maria.rodriguez@students.spelman.edu', '(404) 555-0108', 
   CURRENT_DATE + INTERVAL '2 days', '13:30:00', 20, 'office-hours', 'confirmed', 
   'Academic advising and course selection', 'Sophomore, considering music minor', NOW(), NOW()),
  
  ('Audition - James Wilson', 'James Wilson', 'james.wilson@students.spelman.edu', '(404) 555-0109', 
   CURRENT_DATE + INTERVAL '3 days', '15:45:00', 15, 'audition', 'pending', 
   'Callback audition for Glee Club', 'Second round audition', NOW(), NOW()),
  
  ('Voice Lesson - Rachel Green', 'Rachel Green', 'rachel.green@students.spelman.edu', '(404) 555-0110', 
   CURRENT_DATE + INTERVAL '4 days', '16:30:00', 30, 'lesson', 'confirmed', 
   'Individual voice lesson - tenor technique', 'Working on upper register development', NOW(), NOW()),

  -- Next week's pending appointments
  ('Audition - New Member', 'Candidate #1', 'candidate1@email.com', '(404) 555-0201', 
   CURRENT_DATE + INTERVAL '7 days', '14:00:00', 15, 'audition', 'pending', 
   'New member audition for Spring semester', 'Scheduled through online booking', NOW(), NOW()),
  
  ('Audition - New Member', 'Candidate #2', 'candidate2@email.com', '(404) 555-0202', 
   CURRENT_DATE + INTERVAL '7 days', '14:15:00', 15, 'audition', 'pending', 
   'New member audition for Spring semester', 'Scheduled through online booking', NOW(), NOW()),
  
  ('Office Hours - Student Advising', 'Pending Student', 'student@spelman.edu', '(404) 555-0203', 
   CURRENT_DATE + INTERVAL '8 days', '11:00:00', 20, 'office-hours', 'pending', 
   'Academic and career guidance session', 'Graduation planning discussion', NOW(), NOW()),
  
  ('Voice Lesson - Advanced', 'Advanced Student', 'advanced@spelman.edu', '(404) 555-0204', 
   CURRENT_DATE + INTERVAL '9 days', '15:00:00', 45, 'lesson', 'pending', 
   'Advanced voice lesson for performance preparation', 'Senior recital preparation', NOW(), NOW()),
  
  ('Faculty Consultation', 'Faculty Member', 'faculty@spelman.edu', '(404) 555-0205', 
   CURRENT_DATE + INTERVAL '10 days', '16:00:00', 30, 'meeting', 'pending', 
   'Curriculum development discussion', 'New course proposal review', NOW(), NOW());

-- Update appointment statistics for realism
UPDATE gw_appointments 
SET created_at = created_at - INTERVAL '1 day' + (RANDOM() * INTERVAL '24 hours')
WHERE client_name NOT LIKE 'Candidate%';