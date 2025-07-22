-- Insert Spelman College Academic Calendar Events for 2024-2025 with valid event types
INSERT INTO public.gw_events (
  title, description, event_type, start_date, end_date, location, 
  is_public, registration_required, status, calendar_id, image_url,
  venue_name, created_by
) VALUES 
-- August 2024
('New Student Orientation', 'Week-long orientation for new students', 'other', '2024-08-13 09:00:00-04', '2024-08-19 17:00:00-04', 'Spelman College Campus', true, false, 'scheduled', '931a4ae9-2a06-4111-a217-59083632b1a3', '/src/assets/spelman-logo.png', 'Spelman College', '908961cc-623d-43b6-898a-65d37f7eba54'),
('First Day of Classes', 'Beginning of Fall 2024 semester', 'other', '2024-08-20 08:00:00-04', '2024-08-20 17:00:00-04', 'Spelman College Campus', true, false, 'scheduled', '931a4ae9-2a06-4111-a217-59083632b1a3', '/src/assets/spelman-logo.png', 'Spelman College', '908961cc-623d-43b6-898a-65d37f7eba54'),

-- September 2024
('Labor Day - Campus Closed', 'Holiday - No Classes', 'other', '2024-09-01 00:00:00-04', '2024-09-01 23:59:59-04', 'Spelman College Campus', true, false, 'scheduled', '931a4ae9-2a06-4111-a217-59083632b1a3', '/src/assets/spelman-logo.png', 'Spelman College', '908961cc-623d-43b6-898a-65d37f7eba54'),
('Mid-semester Examinations', 'Fall 2024 mid-semester exams', 'other', '2024-09-25 08:00:00-04', '2024-09-26 17:00:00-04', 'Spelman College Campus', true, false, 'scheduled', '931a4ae9-2a06-4111-a217-59083632b1a3', '/src/assets/spelman-logo.png', 'Spelman College', '908961cc-623d-43b6-898a-65d37f7eba54'),

-- October 2024
('Fall Break', 'No Classes', 'other', '2024-10-06 00:00:00-04', '2024-10-07 23:59:59-04', 'Spelman College Campus', true, false, 'scheduled', '931a4ae9-2a06-4111-a217-59083632b1a3', '/src/assets/spelman-logo.png', 'Spelman College', '908961cc-623d-43b6-898a-65d37f7eba54'),
('Last Day to Withdraw from Course', 'Deadline for course withdrawal', 'other', '2024-10-13 23:59:59-04', '2024-10-13 23:59:59-04', 'Spelman College Campus', true, false, 'scheduled', '931a4ae9-2a06-4111-a217-59083632b1a3', '/src/assets/spelman-logo.png', 'Spelman College', '908961cc-623d-43b6-898a-65d37f7eba54'),

-- November 2024
('No Classes', 'No Classes Day', 'other', '2024-11-26 00:00:00-05', '2024-11-26 23:59:59-05', 'Spelman College Campus', true, false, 'scheduled', '931a4ae9-2a06-4111-a217-59083632b1a3', '/src/assets/spelman-logo.png', 'Spelman College', '908961cc-623d-43b6-898a-65d37f7eba54'),
('Thanksgiving Break', 'College Closed - No Classes', 'other', '2024-11-27 00:00:00-05', '2024-11-28 23:59:59-05', 'Spelman College Campus', true, false, 'scheduled', '931a4ae9-2a06-4111-a217-59083632b1a3', '/src/assets/spelman-logo.png', 'Spelman College', '908961cc-623d-43b6-898a-65d37f7eba54'),

-- December 2024
('Last Day of Classes', 'End of Fall 2024 semester classes', 'other', '2024-12-03 17:00:00-05', '2024-12-03 17:00:00-05', 'Spelman College Campus', true, false, 'scheduled', '931a4ae9-2a06-4111-a217-59083632b1a3', '/src/assets/spelman-logo.png', 'Spelman College', '908961cc-623d-43b6-898a-65d37f7eba54'),
('Reading Period', 'Study period before finals', 'other', '2024-12-05 08:00:00-05', '2024-12-06 17:00:00-05', 'Spelman College Campus', true, false, 'scheduled', '931a4ae9-2a06-4111-a217-59083632b1a3', '/src/assets/spelman-logo.png', 'Spelman College', '908961cc-623d-43b6-898a-65d37f7eba54'),
('Final Examinations', 'Fall 2024 final exams', 'other', '2024-12-08 08:00:00-05', '2024-12-12 17:00:00-05', 'Spelman College Campus', true, false, 'scheduled', '931a4ae9-2a06-4111-a217-59083632b1a3', '/src/assets/spelman-logo.png', 'Spelman College', '908961cc-623d-43b6-898a-65d37f7eba54'),
('Fall Semester Ends', 'End of Fall 2024 semester', 'other', '2024-12-12 17:00:00-05', '2024-12-12 17:00:00-05', 'Spelman College Campus', true, false, 'scheduled', '931a4ae9-2a06-4111-a217-59083632b1a3', '/src/assets/spelman-logo.png', 'Spelman College', '908961cc-623d-43b6-898a-65d37f7eba54'),

-- January 2025
('Spring Classes Begin', 'Beginning of Spring 2025 semester', 'other', '2025-01-14 08:00:00-05', '2025-01-14 17:00:00-05', 'Spelman College Campus', true, false, 'scheduled', '931a4ae9-2a06-4111-a217-59083632b1a3', '/src/assets/spelman-logo.png', 'Spelman College', '908961cc-623d-43b6-898a-65d37f7eba54'),
('Martin Luther King Jr. Day', 'Holiday - Campus Closed, No Classes', 'other', '2025-01-19 00:00:00-05', '2025-01-19 23:59:59-05', 'Spelman College Campus', true, false, 'scheduled', '931a4ae9-2a06-4111-a217-59083632b1a3', '/src/assets/spelman-logo.png', 'Spelman College', '908961cc-623d-43b6-898a-65d37f7eba54'),

-- March 2025
('Mid-Semester Examinations', 'Spring 2025 mid-semester exams', 'other', '2025-03-05 08:00:00-05', '2025-03-06 17:00:00-05', 'Spelman College Campus', true, false, 'scheduled', '931a4ae9-2a06-4111-a217-59083632b1a3', '/src/assets/spelman-logo.png', 'Spelman College', '908961cc-623d-43b6-898a-65d37f7eba54'),
('Spring Break', 'College Open - No Classes', 'other', '2025-03-09 00:00:00-05', '2025-03-13 23:59:59-04', 'Spelman College Campus', true, false, 'scheduled', '931a4ae9-2a06-4111-a217-59083632b1a3', '/src/assets/spelman-logo.png', 'Spelman College', '908961cc-623d-43b6-898a-65d37f7eba54'),

-- April 2025
('Good Friday', 'Holiday - College Closed', 'other', '2025-04-03 00:00:00-04', '2025-04-03 23:59:59-04', 'Spelman College Campus', true, false, 'scheduled', '931a4ae9-2a06-4111-a217-59083632b1a3', '/src/assets/spelman-logo.png', 'Spelman College', '908961cc-623d-43b6-898a-65d37f7eba54'),
('Founders Day Observed', 'Celebrating Spelman College Founders Day', 'performance', '2025-04-09 09:00:00-04', '2025-04-09 17:00:00-04', 'Spelman College Campus', true, false, 'scheduled', '931a4ae9-2a06-4111-a217-59083632b1a3', '/src/assets/spelman-logo.png', 'Spelman College', '908961cc-623d-43b6-898a-65d37f7eba54'),
('Research Day', 'No Classes - Research Presentations', 'other', '2025-04-17 08:00:00-04', '2025-04-17 17:00:00-04', 'Spelman College Campus', true, false, 'scheduled', '931a4ae9-2a06-4111-a217-59083632b1a3', '/src/assets/spelman-logo.png', 'Spelman College', '908961cc-623d-43b6-898a-65d37f7eba54'),
('Last Day of Classes', 'End of Spring 2025 semester classes', 'other', '2025-04-29 17:00:00-04', '2025-04-29 17:00:00-04', 'Spelman College Campus', true, false, 'scheduled', '931a4ae9-2a06-4111-a217-59083632b1a3', '/src/assets/spelman-logo.png', 'Spelman College', '908961cc-623d-43b6-898a-65d37f7eba54'),

-- May 2025
('Final Examinations', 'Spring 2025 final exams', 'other', '2025-05-04 08:00:00-04', '2025-05-08 17:00:00-04', 'Spelman College Campus', true, false, 'scheduled', '931a4ae9-2a06-4111-a217-59083632b1a3', '/src/assets/spelman-logo.png', 'Spelman College', '908961cc-623d-43b6-898a-65d37f7eba54'),
('Spring Semester Ends', 'End of Spring 2025 semester', 'other', '2025-05-08 17:00:00-04', '2025-05-08 17:00:00-04', 'Spelman College Campus', true, false, 'scheduled', '931a4ae9-2a06-4111-a217-59083632b1a3', '/src/assets/spelman-logo.png', 'Spelman College', '908961cc-623d-43b6-898a-65d37f7eba54'),
('Baccalaureate', 'Baccalaureate service for graduating students', 'performance', '2025-05-16 10:00:00-04', '2025-05-16 12:00:00-04', 'Spelman College Campus', true, false, 'scheduled', '931a4ae9-2a06-4111-a217-59083632b1a3', '/src/assets/spelman-logo.png', 'Spelman College', '908961cc-623d-43b6-898a-65d37f7eba54'),
('Commencement', 'Graduation ceremony', 'performance', '2025-05-17 10:00:00-04', '2025-05-17 14:00:00-04', 'Spelman College Campus', true, false, 'scheduled', '931a4ae9-2a06-4111-a217-59083632b1a3', '/src/assets/spelman-logo.png', 'Spelman College', '908961cc-623d-43b6-898a-65d37f7eba54');