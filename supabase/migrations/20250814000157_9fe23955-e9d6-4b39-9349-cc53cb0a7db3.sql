-- Remove all mock appointment data that was just added
DELETE FROM gw_appointments 
WHERE client_name IN (
  'Dr. Sarah Johnson', 'Emily Chen', 'Marcus Williams', 'Jessica Taylor', 
  'David Brown', 'Ashley Miller', 'Kevin Adams', 'Maria Rodriguez', 
  'James Wilson', 'Rachel Green', 'Candidate #1', 'Candidate #2', 
  'Pending Student', 'Advanced Student', 'Faculty Member'
);