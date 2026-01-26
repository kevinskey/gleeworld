-- Add module_id column to course_discussions to link discussions to specific modules
ALTER TABLE course_discussions 
ADD COLUMN IF NOT EXISTS module_id UUID NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_course_discussions_module_id ON course_discussions(module_id);

-- Insert weekly discussions for MUS-240 (Fall 2025 course, Spring 2026 semester)
-- Each discussion is due on Sunday at 11:59 PM of its module week
INSERT INTO course_discussions (course_id, title, content, created_by, is_locked, reply_count, due_date, max_points, is_graded, module_id)
VALUES
  -- Week 1: Introduction (ends Jan 23, Sunday Jan 25 = 11:59 PM)
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', 'Week 1: Introduction to African American Music', 
   'Reflect on the significance of African American music in shaping American culture. What aspects of this musical tradition are you most interested in exploring this semester?',
   (SELECT id FROM auth.users LIMIT 1), false, 0, '2026-01-25T23:59:00Z', 10, true, '262e090d-8490-428e-a914-a753e9ed56c9'),
  
  -- Week 2: Spirituals (ends Jan 30, Sunday Feb 1 = 11:59 PM)
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', 'Week 2: Spirituals and the Enslaved Experience',
   'Discuss the dual purpose of Negro spirituals during slavery. How did these songs serve both religious and practical purposes for enslaved people?',
   (SELECT id FROM auth.users LIMIT 1), false, 0, '2026-02-01T23:59:00Z', 10, true, '848eadd1-d275-46cb-a28e-246f61bc88d2'),
  
  -- Week 3: Blues (ends Feb 6, Sunday Feb 8 = 11:59 PM)
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', 'Week 3: Blues - From Delta to Urban',
   'Explore the evolution of blues from the Mississippi Delta to urban centers like Chicago. What social and economic factors contributed to this transformation?',
   (SELECT id FROM auth.users LIMIT 1), false, 0, '2026-02-08T23:59:00Z', 10, true, 'c06b5b2e-9a8c-43c7-a3d7-d8199073b6eb'),
  
  -- Week 4: Ragtime and Jazz (ends Feb 14, Sunday Feb 15 = 11:59 PM)
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', 'Week 4: Ragtime and the Birth of Jazz',
   'Analyze the relationship between ragtime and early jazz. How did Scott Joplin and other ragtime composers influence the development of jazz?',
   (SELECT id FROM auth.users LIMIT 1), false, 0, '2026-02-15T23:59:00Z', 10, true, 'd7d95743-1b2e-4e8e-ab5d-8de64ef354cf'),
  
  -- Week 5: Jubilee Quartet and Swing (ends Feb 20, Sunday Feb 22 = 11:59 PM)
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', 'Week 5: Jubilee Quartet, Swing and WWII',
   'Discuss the role of music during World War II. How did swing music and jubilee quartets contribute to American morale and identity during the war?',
   (SELECT id FROM auth.users LIMIT 1), false, 0, '2026-02-22T23:59:00Z', 10, true, 'd8d6c433-4499-4612-8c5e-2bef7ec5f4aa'),
  
  -- Week 6: Jazz and Gospel (ends Feb 27, Sunday Mar 1 = 11:59 PM)
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', 'Week 6: Jazz Continued and the Birth of Gospel',
   'Explore the sacred-secular divide in African American music. How did gospel music emerge from spirituals while jazz developed its own path?',
   (SELECT id FROM auth.users LIMIT 1), false, 0, '2026-03-01T23:59:00Z', 10, true, '630659c8-6778-4e44-a870-6ce19fc01535'),
  
  -- Week 7: Civil Rights and Funk (ends Mar 6, Sunday Mar 8 = 11:59 PM, before Spring Break)
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', 'Week 7: Civil Rights Music and Funk',
   'Analyze the role of music in the Civil Rights Movement. How did artists use their platform to advocate for social change, and how did this lead to the emergence of funk?',
   (SELECT id FROM auth.users LIMIT 1), false, 0, '2026-03-08T23:59:00Z', 10, true, 'e9bb65ea-f7b8-4e19-aba3-81c51a538aaf'),
  
  -- Week 8: Gospel Project Part 1 (ends Mar 20, Sunday Mar 22 = 11:59 PM)
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', 'Week 8: Gospel Music Project - The State of Gospel (Part 1)',
   'Share your initial observations for the Gospel Music Project. What trends do you see in contemporary gospel music?',
   (SELECT id FROM auth.users LIMIT 1), false, 0, '2026-03-22T23:59:00Z', 10, true, '1163d504-b673-4d1d-a641-2186ba32dd98'),
  
  -- Week 9: Gospel Project Part 2 (ends Mar 27, Sunday Mar 29 = 11:59 PM)
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', 'Week 9: Gospel Music Project - The State of Gospel (Part 2)',
   'Present your findings from the Gospel Music Project. Respond to at least two of your classmates'' presentations with thoughtful feedback.',
   (SELECT id FROM auth.users LIMIT 1), false, 0, '2026-03-29T23:59:00Z', 10, true, 'd97b3c1c-4bca-49a2-a4e0-2cf550b19e05'),
  
  -- Week 10: Disco and Techno (ends Apr 3, Sunday Apr 5 = 11:59 PM)
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', 'Week 10: Disco and Detroit Techno',
   'Examine the connection between disco and the emergence of Detroit techno. How did electronic music become a new form of African American musical expression?',
   (SELECT id FROM auth.users LIMIT 1), false, 0, '2026-04-05T23:59:00Z', 10, true, '8c311107-c70c-496d-8485-4a8feb63ed01'),
  
  -- Week 11: R&B and Soul (ends Apr 10, Sunday Apr 12 = 11:59 PM)
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', 'Week 11: R&B and Soul',
   'Discuss the evolution of R&B and soul music. How do artists like Aretha Franklin, Marvin Gaye, and Stevie Wonder continue to influence contemporary music?',
   (SELECT id FROM auth.users LIMIT 1), false, 0, '2026-04-12T23:59:00Z', 10, true, '0cc0a941-cdb8-4dc5-b2e3-22b7de627b9f'),
  
  -- Week 12: Hip-Hop Part 1 (ends Apr 17, Sunday Apr 19 = 11:59 PM)
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', 'Week 12: Hip-Hop (Part 1)',
   'Explore the origins of hip-hop culture in the Bronx. How did DJ Kool Herc, Grandmaster Flash, and other pioneers create a new art form?',
   (SELECT id FROM auth.users LIMIT 1), false, 0, '2026-04-19T23:59:00Z', 10, true, '8c030138-2fad-4b58-a666-4c07a8ce9a8d'),
  
  -- Week 13: Hip-Hop Part 2 (ends Apr 24, Sunday Apr 26 = 11:59 PM)
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', 'Week 13: Hip-Hop (Part 2)',
   'Analyze the evolution of hip-hop from party music to social commentary. How has the genre addressed issues of race, class, and identity?',
   (SELECT id FROM auth.users LIMIT 1), false, 0, '2026-04-26T23:59:00Z', 10, true, '82096888-7639-4ba8-b985-dee62aa5e827'),
  
  -- Week 14: Fourth Turning Music (ends May 1, Sunday May 3 = 11:59 PM)
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', 'Week 14: Fourth Turning Music',
   'Reflect on how African American music has evolved through different historical eras. What role does music play in times of social transformation?',
   (SELECT id FROM auth.users LIMIT 1), false, 0, '2026-05-03T23:59:00Z', 10, true, '8afd7cb5-4468-4b62-9955-4ac99fcdb26f')