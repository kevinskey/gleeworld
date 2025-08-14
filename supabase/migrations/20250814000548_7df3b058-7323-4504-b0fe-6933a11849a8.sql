-- Populate Auditions Management with realistic audition session and application data
-- Fixed empty array type casting

-- First, create an active audition session for Spring 2025
INSERT INTO audition_sessions (
  name,
  description,
  start_date,
  end_date,
  application_deadline,
  audition_dates,
  is_active,
  max_applicants,
  requirements,
  created_by,
  created_at,
  updated_at
) VALUES (
  'Spring 2025 New Member Auditions',
  'Spring semester auditions for prospective Spelman College Glee Club members. Open to all students who wish to join our musical family.',
  CURRENT_DATE + INTERVAL '1 week',
  CURRENT_DATE + INTERVAL '3 weeks',
  CURRENT_DATE + INTERVAL '5 days',
  ARRAY[
    (CURRENT_DATE + INTERVAL '1 week')::text,
    (CURRENT_DATE + INTERVAL '1 week 1 day')::text,
    (CURRENT_DATE + INTERVAL '1 week 2 days')::text,
    (CURRENT_DATE + INTERVAL '2 weeks')::text,
    (CURRENT_DATE + INTERVAL '2 weeks 1 day')::text
  ],
  true,
  75,
  'Prepare one song of your choice (any genre). No sheet music required. Be ready to do some basic vocal exercises and sight reading (we will teach you if you do not know how to sight read).',
  NULL,
  NOW(),
  NOW()
);

-- Get the session ID for the applications
WITH session_data AS (
  SELECT id as session_id FROM audition_sessions WHERE name = 'Spring 2025 New Member Auditions'
)

-- Create realistic audition applications with scheduled appointment times
INSERT INTO audition_applications (
  session_id,
  user_id,
  full_name,
  email,
  phone_number,
  audition_time_slot,
  status,
  academic_year,
  voice_part_preference,
  sight_reading_level,
  previous_choir_experience,
  years_of_vocal_training,
  instruments_played,
  prepared_pieces,
  why_glee_club,
  vocal_goals,
  music_theory_background,
  availability_conflicts,
  notes,
  profile_image_url,
  created_at,
  updated_at
) 
SELECT 
  session_data.session_id,
  gen_random_uuid(),
  applicant_name,
  email,
  phone,
  audition_datetime,
  status,
  academic_year,
  voice_part,
  sight_reading,
  choir_experience,
  vocal_training,
  instruments,
  pieces,
  why_join,
  goals,
  theory_bg,
  conflicts,
  notes,
  image_url,
  created_time,
  NOW()
FROM session_data,
(VALUES
  -- Monday 2:00 PM - 4:00 PM slots
  ('Amara Williams', 'amara.williams@students.spelman.edu', '(404) 555-1001', CURRENT_DATE + INTERVAL '1 week 14 hours', 'submitted', 'Freshman', 'Soprano', 'Beginner', 'High school choir - 3 years', 2, ARRAY['Piano'], '"Amazing Grace" - Traditional', 'I want to be part of the Spelman musical legacy and grow as a vocalist.', 'Improve my range and stage presence', 'Basic music theory from high school', 'Tuesday evenings - work study', 'Strong classical background', NULL, NOW() - INTERVAL '2 days'),
  
  ('Zara Johnson', 'zara.johnson@students.spelman.edu', '(404) 555-1002', CURRENT_DATE + INTERVAL '1 week 14 hours 15 minutes', 'submitted', 'Sophomore', 'Alto', 'Intermediate', 'Church choir since age 8', 4, ARRAY['Flute', 'Piano'], '"His Eye is on the Sparrow" - Gospel', 'The Glee Club represents excellence and sisterhood in music.', 'Learn advanced vocal techniques and harmonies', 'Two years of music theory', 'None', 'Transfer student with strong musical foundation', NULL, NOW() - INTERVAL '1 day'),
  
  ('Kira Thompson', 'kira.thompson@students.spelman.edu', '(404) 555-1003', CURRENT_DATE + INTERVAL '1 week 14 hours 30 minutes', 'submitted', 'Junior', 'Soprano', 'Advanced', 'High school and college choir experience', 6, ARRAY['Violin'], '"O Holy Night" - Classical', 'To challenge myself musically and be part of this historic tradition.', 'Perfect my coloratura technique', 'Four years including music theory and composition', 'None', 'Music major with operatic training', NULL, NOW() - INTERVAL '3 hours'),
  
  ('Maya Davis', 'maya.davis@students.spelman.edu', '(404) 555-1004', CURRENT_DATE + INTERVAL '1 week 14 hours 45 minutes', 'submitted', 'Freshman', 'Alto', 'Beginner', 'Church youth choir', 1, ARRAY[]::text[], '"Lift Every Voice and Sing"', 'Spelman Glee Club is a dream of mine since high school.', 'Develop my voice and gain confidence performing', 'None - but eager to learn', 'Chemistry lab on Thursday afternoons', 'Strong alto voice, needs technical training', NULL, NOW() - INTERVAL '6 hours'),
  
  ('Nia Robinson', 'nia.robinson@students.spelman.edu', '(404) 555-1005', CURRENT_DATE + INTERVAL '1 week 15 hours', 'submitted', 'Sophomore', 'Soprano', 'Intermediate', 'All-State choir in high school', 3, ARRAY['Piano'], '"Summertime" - Gershwin', 'To be part of the prestigious musical tradition at Spelman.', 'Expand my repertoire and stage presence', 'High school AP Music Theory', 'Work schedule flexible', 'Excellent sight reader', NULL, NOW() - INTERVAL '12 hours'),
  
  -- Tuesday 2:00 PM - 4:00 PM slots
  ('Jasmine Carter', 'jasmine.carter@students.spelman.edu', '(404) 555-1006', CURRENT_DATE + INTERVAL '1 week 1 day 14 hours', 'submitted', 'Freshman', 'Alto', 'Beginner', 'Middle school and church choir', 2, ARRAY['Guitar'], '"How Great Thou Art"', 'Music brings me joy and I want to share that with others.', 'Learn proper vocal technique and breath control', 'Basic', 'None', 'Self-taught guitarist with natural alto voice', NULL, NOW() - INTERVAL '18 hours'),
  
  ('Aaliyah Brown', 'aaliyah.brown@students.spelman.edu', '(404) 555-1007', CURRENT_DATE + INTERVAL '1 week 1 day 14 hours 15 minutes', 'submitted', 'Junior', 'Soprano', 'Advanced', 'Honor choir and musical theater', 5, ARRAY['Piano', 'Ukulele'], '"Defying Gravity" - Wicked', 'I want to grow musically in a supportive sisterhood environment.', 'Master advanced techniques and leadership skills', 'College level music theory', 'None', 'Musical theater background with strong belt voice', NULL, NOW() - INTERVAL '1 day 2 hours'),
  
  ('Simone Harris', 'simone.harris@students.spelman.edu', '(404) 555-1008', CURRENT_DATE + INTERVAL '1 week 1 day 14 hours 30 minutes', 'submitted', 'Sophomore', 'Alto', 'Intermediate', 'High school jazz choir', 3, ARRAY['Saxophone'], '"At Last" - Etta James', 'Jazz and classical fusion appeals to me, like the Glee Club''s style.', 'Develop my jazz improvisation and classical technique', 'Jazz theory and arrangement', 'Band practice on Wednesdays', 'Strong jazz background, wants to explore classical', NULL, NOW() - INTERVAL '2 days 4 hours'),
  
  ('Destiny Mitchell', 'destiny.mitchell@students.spelman.edu', '(404) 555-1009', CURRENT_DATE + INTERVAL '1 week 1 day 14 hours 45 minutes', 'submitted', 'Freshman', 'Soprano', 'Beginner', 'Church choir', 1, ARRAY[]::text[], '"Amazing Grace"', 'To glorify God through music and grow in my faith journey.', 'Strengthen my voice for worship and performance', 'None', 'Sunday morning church commitments', 'Strong spiritual connection to music', NULL, NOW() - INTERVAL '8 hours'),
  
  ('Kendall Washington', 'kendall.washington@students.spelman.edu', '(404) 555-1010', CURRENT_DATE + INTERVAL '1 week 1 day 15 hours', 'submitted', 'Senior', 'Alto', 'Advanced', 'College choir for 3 years', 4, ARRAY['Piano', 'Cello'], '"Ave Maria" - Schubert', 'Final year - want to end my Spelman journey in the Glee Club.', 'Perfect my classical technique before graduation', 'Music minor coursework', 'Thesis writing time constraints', 'Experienced singer seeking growth in final year', NULL, NOW() - INTERVAL '4 days'),
  
  -- Wednesday callback slots for promising candidates
  ('Taylor Brooks', 'taylor.brooks@students.spelman.edu', '(404) 555-1011', CURRENT_DATE + INTERVAL '1 week 2 days 14 hours', 'callback_scheduled', 'Sophomore', 'Soprano', 'Advanced', 'Regional honor choir', 4, ARRAY['Piano', 'Violin'], '"O mio babbino caro" - Puccini', 'Classical music is my passion and Glee Club is the pinnacle.', 'Prepare for graduate vocal performance programs', 'Extensive classical training', 'None', 'Exceptional voice, callback for leadership potential', NULL, NOW() - INTERVAL '5 days'),
  
  ('Morgan Lee', 'morgan.lee@students.spelman.edu', '(404) 555-1012', CURRENT_DATE + INTERVAL '1 week 2 days 14 hours 30 minutes', 'callback_scheduled', 'Junior', 'Alto', 'Advanced', 'State honor choir and a cappella group', 5, ARRAY['Guitar', 'Piano'], '"The Way You Look Tonight" - Jazz Standard', 'I love the versatility and excellence of the Glee Club repertoire.', 'Leadership experience and advanced ensemble skills', 'Jazz and classical theory', 'None', 'Strong leader, excellent for section leadership', NULL, NOW() - INTERVAL '6 days'),
  
  -- Some pending/scheduled for next week
  ('Gabrielle Adams', 'gabrielle.adams@students.spelman.edu', '(404) 555-1013', CURRENT_DATE + INTERVAL '2 weeks 14 hours', 'scheduled', 'Freshman', 'Soprano', 'Intermediate', 'Show choir and madrigals', 3, ARRAY['Piano'], '"Memory" - Cats', 'Theater and classical music - perfect combination in Glee Club.', 'Combine my theater training with classical technique', 'Music theory through theater training', 'Drama club rehearsals', 'Theater major interested in classical vocal training', NULL, NOW() - INTERVAL '30 minutes'),
  
  ('Aria Coleman', 'aria.coleman@students.spelman.edu', '(404) 555-1014', CURRENT_DATE + INTERVAL '2 weeks 14 hours 15 minutes', 'scheduled', 'Sophomore', 'Alto', 'Intermediate', 'Contemporary Christian and classical training', 3, ARRAY['Piano', 'Drums'], '"How Deep the Father''s Love" - Contemporary Christian', 'Faith-based music ministry combined with academic excellence.', 'Bridge contemporary and classical vocal styles', 'Church music training', 'Youth ministry on weekends', 'Strong spiritual foundation in music', NULL, NOW() - INTERVAL '1 hour'),
  
  ('Sage Parker', 'sage.parker@students.spelman.edu', '(404) 555-1015', CURRENT_DATE + INTERVAL '2 weeks 1 day 14 hours', 'scheduled', 'Junior', 'Soprano', 'Advanced', 'Opera workshop and university choir', 6, ARRAY['Piano'], '"Quando m''en vo" - La Bohème', 'Opera is my specialty but I want to explore other classical styles.', 'Expand beyond opera into art song and spiritual repertoire', 'Graduate level music theory', 'Voice lessons with private instructor', 'Opera concentration, wants ensemble experience', NULL, NOW() - INTERVAL '2 hours')
) AS applicant_data(applicant_name, email, phone, audition_datetime, status, academic_year, voice_part, sight_reading, choir_experience, vocal_training, instruments, pieces, why_join, goals, theory_bg, conflicts, notes, image_url, created_time);