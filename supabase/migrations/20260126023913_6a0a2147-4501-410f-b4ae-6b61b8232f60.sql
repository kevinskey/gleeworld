-- Auto-create journal assignments for each week of MUS-240 Spring 2026
-- These can be edited later by the instructor

INSERT INTO mus240_assignments (
  id, title, description, prompt, points, due_date, is_active, 
  assignment_type, semester, created_by
) VALUES
-- Week 1
(gen_random_uuid(), 'Week 1 Journal: Introduction to African American Music', 
'Reflect on this week''s content about the foundations and significance of African American music.',
'After watching the lecture videos and completing the readings for Week 1, write a short reflection (150-300 words) on the following:

1. What aspects of African American music''s history surprised you the most?
2. How do you see African American musical traditions influencing contemporary music today?
3. What questions do you have as we begin this journey through musical history?

Remember: There is no single "correct" answer. Focus on clarity, thoughtfulness, and sincerity.',
10, '2026-01-23 23:59:00+00', true, 'listening_journal', 'Spring 2026', '4e6c2ec0-1f83-449a-a984-8920f6056ab5'),

-- Week 2
(gen_random_uuid(), 'Week 2 Journal: Spirituals and the Enslaved Experience', 
'Reflect on the spiritual traditions born from the enslaved experience.',
'After engaging with Week 2''s content on spirituals, write a reflection (150-300 words) addressing:

1. How did spirituals serve both religious and practical purposes for enslaved people?
2. What elements of spirituals continue to resonate in modern gospel and popular music?
3. What emotional or intellectual response did you have to the music examples shared this week?

Remember: There is no single "correct" answer. Focus on clarity, thoughtfulness, and sincerity.',
10, '2026-01-30 23:59:00+00', true, 'listening_journal', 'Spring 2026', '4e6c2ec0-1f83-449a-a984-8920f6056ab5'),

-- Week 3
(gen_random_uuid(), 'Week 3 Journal: Blues: From Delta to Urban', 
'Reflect on the evolution of the Blues from its rural origins to urban centers.',
'After engaging with Week 3''s content on the Blues, write a reflection (150-300 words) addressing:

1. How did the migration from the Delta to urban centers transform the sound and themes of the Blues?
2. What emotional truths do you hear in Blues music?
3. Which artist or song from this week''s examples resonated with you most, and why?

Remember: There is no single "correct" answer. Focus on clarity, thoughtfulness, and sincerity.',
10, '2026-02-06 23:59:00+00', true, 'listening_journal', 'Spring 2026', '4e6c2ec0-1f83-449a-a984-8920f6056ab5'),

-- Week 4
(gen_random_uuid(), 'Week 4 Journal: Ragtime and Birth of Jazz', 
'Reflect on the emergence of Ragtime and early Jazz.',
'After engaging with Week 4''s content, write a reflection (150-300 words) addressing:

1. How did Ragtime challenge or reshape American popular music at the turn of the century?
2. What musical elements distinguish early Jazz from its predecessors?
3. How do you hear the influence of Ragtime and early Jazz in music today?

Remember: There is no single "correct" answer. Focus on clarity, thoughtfulness, and sincerity.',
10, '2026-02-14 23:59:00+00', true, 'listening_journal', 'Spring 2026', '4e6c2ec0-1f83-449a-a984-8920f6056ab5'),

-- Week 5
(gen_random_uuid(), 'Week 5 Journal: Jubilee Quartet, Swing and WWII', 
'Reflect on music''s role during the Swing era and World War II.',
'After engaging with Week 5''s content, write a reflection (150-300 words) addressing:

1. How did the Jubilee Quartet tradition influence later vocal groups?
2. What role did Swing music play in American culture during WWII?
3. How did music serve as both entertainment and commentary during this era?

Remember: There is no single "correct" answer. Focus on clarity, thoughtfulness, and sincerity.',
10, '2026-02-20 23:59:00+00', true, 'listening_journal', 'Spring 2026', '4e6c2ec0-1f83-449a-a984-8920f6056ab5'),

-- Week 6
(gen_random_uuid(), 'Week 6 Journal: Jazz Continued and the Birth of Gospel', 
'Reflect on the evolution of Jazz and the emergence of Gospel music.',
'After engaging with Week 6''s content, write a reflection (150-300 words) addressing:

1. How did Gospel music draw from earlier spiritual traditions while creating something new?
2. What connections do you hear between the Jazz of this era and Gospel music?
3. Which artist or performance from this week left the strongest impression on you?

Remember: There is no single "correct" answer. Focus on clarity, thoughtfulness, and sincerity.',
10, '2026-02-27 23:59:00+00', true, 'listening_journal', 'Spring 2026', '4e6c2ec0-1f83-449a-a984-8920f6056ab5'),

-- Week 7
(gen_random_uuid(), 'Week 7 Journal: Civil Rights Music and Funk', 
'Reflect on music as a vehicle for social change during the Civil Rights era.',
'After engaging with Week 7''s content, write a reflection (150-300 words) addressing:

1. How did music function as a tool for the Civil Rights Movement?
2. What is the relationship between Funk and the social/political climate of its time?
3. How do you see music being used for social commentary or change today?

Remember: There is no single "correct" answer. Focus on clarity, thoughtfulness, and sincerity.',
10, '2026-03-06 23:59:00+00', true, 'listening_journal', 'Spring 2026', '4e6c2ec0-1f83-449a-a984-8920f6056ab5'),

-- Week 8
(gen_random_uuid(), 'Week 8 Journal: Gospel Music Project (Part 1)', 
'Begin your exploration of the current state of Gospel music.',
'As you begin the Gospel Music Project, write a reflection (150-300 words) addressing:

1. What is your current understanding of Gospel music''s place in contemporary culture?
2. What questions or areas of Gospel music would you like to explore in this project?
3. How do you see Gospel music evolving while maintaining its spiritual roots?

Remember: There is no single "correct" answer. Focus on clarity, thoughtfulness, and sincerity.',
10, '2026-03-20 23:59:00+00', true, 'listening_journal', 'Spring 2026', '4e6c2ec0-1f83-449a-a984-8920f6056ab5'),

-- Week 9
(gen_random_uuid(), 'Week 9 Journal: Gospel Music Project (Part 2)', 
'Continue your Gospel Music Project reflections.',
'As you continue the Gospel Music Project, write a reflection (150-300 words) addressing:

1. What new insights have you gained about Gospel music through your research?
2. How has your perspective on Gospel''s influence changed during this project?
3. What connections between Gospel and other genres have you discovered?

Remember: There is no single "correct" answer. Focus on clarity, thoughtfulness, and sincerity.',
10, '2026-03-27 23:59:00+00', true, 'listening_journal', 'Spring 2026', '4e6c2ec0-1f83-449a-a984-8920f6056ab5'),

-- Week 10
(gen_random_uuid(), 'Week 10 Journal: Disco and Detroit Techno', 
'Reflect on the emergence of Disco and the birth of Techno.',
'After engaging with Week 10''s content, write a reflection (150-300 words) addressing:

1. How did Disco create space for marginalized communities in American nightlife?
2. What innovations came from the Detroit Techno movement?
3. How do you hear the influence of these genres in today''s electronic music?

Remember: There is no single "correct" answer. Focus on clarity, thoughtfulness, and sincerity.',
10, '2026-04-03 23:59:00+00', true, 'listening_journal', 'Spring 2026', '4e6c2ec0-1f83-449a-a984-8920f6056ab5'),

-- Week 11
(gen_random_uuid(), 'Week 11 Journal: R&B and Soul', 
'Reflect on the development of R&B and Soul music.',
'After engaging with Week 11''s content, write a reflection (150-300 words) addressing:

1. How did R&B and Soul reflect the experiences and aspirations of Black America?
2. What distinguishes the "Soul" sound from earlier R&B?
3. Which artist or song from this week spoke to you most powerfully, and why?

Remember: There is no single "correct" answer. Focus on clarity, thoughtfulness, and sincerity.',
10, '2026-04-10 23:59:00+00', true, 'listening_journal', 'Spring 2026', '4e6c2ec0-1f83-449a-a984-8920f6056ab5'),

-- Week 12
(gen_random_uuid(), 'Week 12 Journal: Hip-Hop (Part 1)', 
'Begin your exploration of Hip-Hop culture and music.',
'After engaging with Week 12''s content on Hip-Hop, write a reflection (150-300 words) addressing:

1. How did Hip-Hop emerge from the social and economic conditions of its time?
2. What are the core elements of Hip-Hop culture beyond just the music?
3. How has your understanding of Hip-Hop''s origins changed through this week''s content?

Remember: There is no single "correct" answer. Focus on clarity, thoughtfulness, and sincerity.',
10, '2026-04-17 23:59:00+00', true, 'listening_journal', 'Spring 2026', '4e6c2ec0-1f83-449a-a984-8920f6056ab5'),

-- Week 13
(gen_random_uuid(), 'Week 13 Journal: Hip-Hop (Part 2)', 
'Continue your exploration of Hip-Hop''s evolution.',
'After engaging with Week 13''s content, write a reflection (150-300 words) addressing:

1. How has Hip-Hop evolved from its origins to the present day?
2. What role does Hip-Hop play in contemporary social and political discourse?
3. How do you see Hip-Hop continuing to evolve in the future?

Remember: There is no single "correct" answer. Focus on clarity, thoughtfulness, and sincerity.',
10, '2026-04-24 23:59:00+00', true, 'listening_journal', 'Spring 2026', '4e6c2ec0-1f83-449a-a984-8920f6056ab5'),

-- Week 14
(gen_random_uuid(), 'Week 14 Journal: Fourth Turning Music', 
'Reflect on music''s role in times of social change and transformation.',
'After engaging with Week 14''s content on Fourth Turning Music, write a reflection (150-300 words) addressing:

1. How have African-American musicians historically responded to moments of social crisis or transformation?
2. What role might music play in the current era of change?
3. What values or messages do you hope music carries forward into the next era?

Remember: There is no single "correct" answer. Focus on clarity, thoughtfulness, and sincerity.',
10, '2026-05-01 23:59:00+00', true, 'listening_journal', 'Spring 2026', '4e6c2ec0-1f83-449a-a984-8920f6056ab5');