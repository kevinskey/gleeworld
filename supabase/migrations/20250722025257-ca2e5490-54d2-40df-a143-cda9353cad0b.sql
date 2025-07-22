-- Insert Spelman College Academic Calendar Events for 2024-2025 Academic Year

INSERT INTO public.gw_events (
  title,
  description,
  event_type,
  start_date,
  end_date,
  venue_name,
  location,
  calendar_id,
  is_public,
  registration_required,
  status,
  created_by,
  created_at,
  updated_at
) VALUES
-- August 2024
('New Student Orientation', 'New Student Orientation Week for incoming students', 'other', '2024-08-13 09:00:00+00', '2024-08-19 17:00:00+00', 'Spelman College Campus', 'Atlanta, GA', '931a4ae9-2a06-4111-a217-59083632b1a3', true, false, 'scheduled', (SELECT id FROM auth.users LIMIT 1), NOW(), NOW()),
('First Day of Classes', 'Beginning of Fall 2024 semester classes', 'other', '2024-08-20 08:00:00+00', '2024-08-20 18:00:00+00', 'Spelman College Campus', 'Atlanta, GA', '931a4ae9-2a06-4111-a217-59083632b1a3', true, false, 'scheduled', (SELECT id FROM auth.users LIMIT 1), NOW(), NOW()),

-- September 2024
('Labor Day - CAMPUS CLOSED', 'Holiday - Labor Day, no classes', 'other', '2024-09-01 00:00:00+00', '2024-09-01 23:59:59+00', 'Spelman College Campus', 'Atlanta, GA', '931a4ae9-2a06-4111-a217-59083632b1a3', true, false, 'scheduled', (SELECT id FROM auth.users LIMIT 1), NOW(), NOW()),
('Mid-semester Examinations', 'Fall 2024 mid-semester examination period', 'other', '2024-09-25 08:00:00+00', '2024-09-26 18:00:00+00', 'Spelman College Campus', 'Atlanta, GA', '931a4ae9-2a06-4111-a217-59083632b1a3', true, false, 'scheduled', (SELECT id FROM auth.users LIMIT 1), NOW(), NOW()),

-- October 2024
('Fall Break - No Classes', 'Fall break period, no classes scheduled', 'other', '2024-10-06 00:00:00+00', '2024-10-07 23:59:59+00', 'Spelman College Campus', 'Atlanta, GA', '931a4ae9-2a06-4111-a217-59083632b1a3', true, false, 'scheduled', (SELECT id FROM auth.users LIMIT 1), NOW(), NOW()),
('Last Day to Withdraw from Course', 'Final deadline for course withdrawal', 'other', '2024-10-13 17:00:00+00', '2024-10-13 17:00:00+00', 'Spelman College Campus', 'Atlanta, GA', '931a4ae9-2a06-4111-a217-59083632b1a3', true, false, 'scheduled', (SELECT id FROM auth.users LIMIT 1), NOW(), NOW()),

-- November 2024
('No Classes', 'Day with no scheduled classes', 'other', '2024-11-26 00:00:00+00', '2024-11-26 23:59:59+00', 'Spelman College Campus', 'Atlanta, GA', '931a4ae9-2a06-4111-a217-59083632b1a3', true, false, 'scheduled', (SELECT id FROM auth.users LIMIT 1), NOW(), NOW()),
('Thanksgiving - COLLEGE CLOSED', 'Thanksgiving holiday, college closed', 'other', '2024-11-27 00:00:00+00', '2024-11-28 23:59:59+00', 'Spelman College Campus', 'Atlanta, GA', '931a4ae9-2a06-4111-a217-59083632b1a3', true, false, 'scheduled', (SELECT id FROM auth.users LIMIT 1), NOW(), NOW()),

-- December 2024
('Last Day of Classes', 'Final day of Fall 2024 semester classes', 'other', '2024-12-03 08:00:00+00', '2024-12-03 18:00:00+00', 'Spelman College Campus', 'Atlanta, GA', '931a4ae9-2a06-4111-a217-59083632b1a3', true, false, 'scheduled', (SELECT id FROM auth.users LIMIT 1), NOW(), NOW()),
('Reading Period', 'Study period before final examinations', 'other', '2024-12-05 08:00:00+00', '2024-12-06 18:00:00+00', 'Spelman College Campus', 'Atlanta, GA', '931a4ae9-2a06-4111-a217-59083632b1a3', true, false, 'scheduled', (SELECT id FROM auth.users LIMIT 1), NOW(), NOW()),
('Final Examinations', 'Fall 2024 final examination period', 'other', '2024-12-08 08:00:00+00', '2024-12-12 18:00:00+00', 'Spelman College Campus', 'Atlanta, GA', '931a4ae9-2a06-4111-a217-59083632b1a3', true, false, 'scheduled', (SELECT id FROM auth.users LIMIT 1), NOW(), NOW()),
('Fall Semester Ends', 'End of Fall 2024 semester', 'other', '2024-12-12 18:00:00+00', '2024-12-12 18:00:00+00', 'Spelman College Campus', 'Atlanta, GA', '931a4ae9-2a06-4111-a217-59083632b1a3', true, false, 'scheduled', (SELECT id FROM auth.users LIMIT 1), NOW(), NOW()),

-- January 2025
('Classes Begin', 'Beginning of Spring 2025 semester classes', 'other', '2025-01-14 08:00:00+00', '2025-01-14 18:00:00+00', 'Spelman College Campus', 'Atlanta, GA', '931a4ae9-2a06-4111-a217-59083632b1a3', true, false, 'scheduled', (SELECT id FROM auth.users LIMIT 1), NOW(), NOW()),
('Martin Luther King Jr. Day - CAMPUS CLOSED', 'Holiday - Martin Luther King Jr. Day, campus closed', 'other', '2025-01-19 00:00:00+00', '2025-01-19 23:59:59+00', 'Spelman College Campus', 'Atlanta, GA', '931a4ae9-2a06-4111-a217-59083632b1a3', true, false, 'scheduled', (SELECT id FROM auth.users LIMIT 1), NOW(), NOW()),

-- March 2025
('Mid-Semester Examinations', 'Spring 2025 mid-semester examination period', 'other', '2025-03-05 08:00:00+00', '2025-03-06 18:00:00+00', 'Spelman College Campus', 'Atlanta, GA', '931a4ae9-2a06-4111-a217-59083632b1a3', true, false, 'scheduled', (SELECT id FROM auth.users LIMIT 1), NOW(), NOW()),
('Spring Break - College Open', 'Spring break period, college open but no classes', 'other', '2025-03-09 00:00:00+00', '2025-03-13 23:59:59+00', 'Spelman College Campus', 'Atlanta, GA', '931a4ae9-2a06-4111-a217-59083632b1a3', true, false, 'scheduled', (SELECT id FROM auth.users LIMIT 1), NOW(), NOW()),

-- April 2025
('Good Friday - COLLEGE CLOSED', 'Holiday - Good Friday, college closed', 'other', '2025-04-03 00:00:00+00', '2025-04-03 23:59:59+00', 'Spelman College Campus', 'Atlanta, GA', '931a4ae9-2a06-4111-a217-59083632b1a3', true, false, 'scheduled', (SELECT id FROM auth.users LIMIT 1), NOW(), NOW()),
('Founders Day Observed', 'Observance of Spelman College Founders Day', 'other', '2025-04-09 10:00:00+00', '2025-04-09 16:00:00+00', 'Spelman College Campus', 'Atlanta, GA', '931a4ae9-2a06-4111-a217-59083632b1a3', true, false, 'scheduled', (SELECT id FROM auth.users LIMIT 1), NOW(), NOW()),
('Research Day - No Classes', 'Research Day, no regular classes scheduled', 'other', '2025-04-17 08:00:00+00', '2025-04-17 18:00:00+00', 'Spelman College Campus', 'Atlanta, GA', '931a4ae9-2a06-4111-a217-59083632b1a3', true, false, 'scheduled', (SELECT id FROM auth.users LIMIT 1), NOW(), NOW()),
('Last Day of Classes', 'Final day of Spring 2025 semester classes', 'other', '2025-04-29 08:00:00+00', '2025-04-29 18:00:00+00', 'Spelman College Campus', 'Atlanta, GA', '931a4ae9-2a06-4111-a217-59083632b1a3', true, false, 'scheduled', (SELECT id FROM auth.users LIMIT 1), NOW(), NOW()),

-- May 2025
('Final Examinations', 'Spring 2025 final examination period', 'other', '2025-05-04 08:00:00+00', '2025-05-08 18:00:00+00', 'Spelman College Campus', 'Atlanta, GA', '931a4ae9-2a06-4111-a217-59083632b1a3', true, false, 'scheduled', (SELECT id FROM auth.users LIMIT 1), NOW(), NOW()),
('Spring Semester Ends', 'End of Spring 2025 semester', 'other', '2025-05-08 18:00:00+00', '2025-05-08 18:00:00+00', 'Spelman College Campus', 'Atlanta, GA', '931a4ae9-2a06-4111-a217-59083632b1a3', true, false, 'scheduled', (SELECT id FROM auth.users LIMIT 1), NOW(), NOW()),
('Baccalaureate', 'Baccalaureate ceremony for graduating students', 'performance', '2025-05-16 10:00:00+00', '2025-05-16 12:00:00+00', 'Spelman College Campus', 'Atlanta, GA', '931a4ae9-2a06-4111-a217-59083632b1a3', true, false, 'scheduled', (SELECT id FROM auth.users LIMIT 1), NOW(), NOW()),
('Commencement', 'Graduation ceremony for Class of 2025', 'performance', '2025-05-17 10:00:00+00', '2025-05-17 13:00:00+00', 'Spelman College Campus', 'Atlanta, GA', '931a4ae9-2a06-4111-a217-59083632b1a3', true, false, 'scheduled', (SELECT id FROM auth.users LIMIT 1), NOW(), NOW());