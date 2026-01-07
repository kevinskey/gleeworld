-- Generate Spring 2026 class sessions for MUS 210
-- Course meets Monday and Wednesday, 2:00-2:50 PM
-- Semester: Jan 14 - Apr 29, 2026
-- Excludes: MLK Day (Jan 19), Spring Break (Mar 9-13), Good Friday (Apr 3)

-- First, delete any existing sessions for this course to avoid duplicates
DELETE FROM gw_course_sessions WHERE course_id = '2026c613-bda7-487a-a5d9-91e57c26a741';

-- Insert all MUS 210 class sessions for Spring 2026
INSERT INTO gw_course_sessions (course_id, session_index, session_date, start_at, end_at, title, week_index, status) VALUES
-- Week 1
('2026c613-bda7-487a-a5d9-91e57c26a741', 1, '2026-01-14', '2026-01-14T14:00:00-05:00', '2026-01-14T14:50:00-05:00', 'MUS 210 - Session 1: Conducting Fundamentals', 1, 'planned'),
('2026c613-bda7-487a-a5d9-91e57c26a741', 2, '2026-01-21', '2026-01-21T14:00:00-05:00', '2026-01-21T14:50:00-05:00', 'MUS 210 - Session 2: Basic Beat Patterns', 1, 'planned'),
-- Week 2
('2026c613-bda7-487a-a5d9-91e57c26a741', 3, '2026-01-26', '2026-01-26T14:00:00-05:00', '2026-01-26T14:50:00-05:00', 'MUS 210 - Session 3: Dynamics & Expression', 2, 'planned'),
('2026c613-bda7-487a-a5d9-91e57c26a741', 4, '2026-01-28', '2026-01-28T14:00:00-05:00', '2026-01-28T14:50:00-05:00', 'MUS 210 - Session 4: Cueing & Cutoffs', 2, 'planned'),
-- Week 3
('2026c613-bda7-487a-a5d9-91e57c26a741', 5, '2026-02-02', '2026-02-02T14:00:00-05:00', '2026-02-02T14:50:00-05:00', 'MUS 210 - Session 5: Score Study Basics', 3, 'planned'),
('2026c613-bda7-487a-a5d9-91e57c26a741', 6, '2026-02-04', '2026-02-04T14:00:00-05:00', '2026-02-04T14:50:00-05:00', 'MUS 210 - Session 6: Choral Voicing', 3, 'planned'),
-- Week 4
('2026c613-bda7-487a-a5d9-91e57c26a741', 7, '2026-02-09', '2026-02-09T14:00:00-05:00', '2026-02-09T14:50:00-05:00', 'MUS 210 - Session 7: Rehearsal Techniques I', 4, 'planned'),
('2026c613-bda7-487a-a5d9-91e57c26a741', 8, '2026-02-11', '2026-02-11T14:00:00-05:00', '2026-02-11T14:50:00-05:00', 'MUS 210 - Session 8: Rehearsal Techniques II', 4, 'planned'),
-- Week 5
('2026c613-bda7-487a-a5d9-91e57c26a741', 9, '2026-02-16', '2026-02-16T14:00:00-05:00', '2026-02-16T14:50:00-05:00', 'MUS 210 - Session 9: Choral Blend & Balance', 5, 'planned'),
('2026c613-bda7-487a-a5d9-91e57c26a741', 10, '2026-02-18', '2026-02-18T14:00:00-05:00', '2026-02-18T14:50:00-05:00', 'MUS 210 - Session 10: Diction & Text', 5, 'planned'),
-- Week 6
('2026c613-bda7-487a-a5d9-91e57c26a741', 11, '2026-02-23', '2026-02-23T14:00:00-05:00', '2026-02-23T14:50:00-05:00', 'MUS 210 - Session 11: Historical Periods I', 6, 'planned'),
('2026c613-bda7-487a-a5d9-91e57c26a741', 12, '2026-02-25', '2026-02-25T14:00:00-05:00', '2026-02-25T14:50:00-05:00', 'MUS 210 - Session 12: Historical Periods II', 6, 'planned'),
-- Week 7
('2026c613-bda7-487a-a5d9-91e57c26a741', 13, '2026-03-02', '2026-03-02T14:00:00-05:00', '2026-03-02T14:50:00-05:00', 'MUS 210 - Session 13: Midterm Review', 7, 'planned'),
('2026c613-bda7-487a-a5d9-91e57c26a741', 14, '2026-03-04', '2026-03-04T14:00:00-05:00', '2026-03-04T14:50:00-05:00', 'MUS 210 - Session 14: Midterm Conducting Exam', 7, 'planned'),
-- Week 8: Spring Break (Mar 9-13) - no classes
-- Week 9
('2026c613-bda7-487a-a5d9-91e57c26a741', 15, '2026-03-16', '2026-03-16T14:00:00-05:00', '2026-03-16T14:50:00-05:00', 'MUS 210 - Session 15: Contemporary Choral Music', 9, 'planned'),
('2026c613-bda7-487a-a5d9-91e57c26a741', 16, '2026-03-18', '2026-03-18T14:00:00-05:00', '2026-03-18T14:50:00-05:00', 'MUS 210 - Session 16: African American Spirituals', 9, 'planned'),
-- Week 10
('2026c613-bda7-487a-a5d9-91e57c26a741', 17, '2026-03-23', '2026-03-23T14:00:00-05:00', '2026-03-23T14:50:00-05:00', 'MUS 210 - Session 17: Gospel Music Traditions', 10, 'planned'),
('2026c613-bda7-487a-a5d9-91e57c26a741', 18, '2026-03-25', '2026-03-25T14:00:00-05:00', '2026-03-25T14:50:00-05:00', 'MUS 210 - Session 18: Conducting Gospel', 10, 'planned'),
-- Week 11
('2026c613-bda7-487a-a5d9-91e57c26a741', 19, '2026-03-30', '2026-03-30T14:00:00-05:00', '2026-03-30T14:50:00-05:00', 'MUS 210 - Session 19: Jazz & Pop Choral', 11, 'planned'),
('2026c613-bda7-487a-a5d9-91e57c26a741', 20, '2026-04-01', '2026-04-01T14:00:00-05:00', '2026-04-01T14:50:00-05:00', 'MUS 210 - Session 20: A Cappella Arranging', 11, 'planned'),
-- Week 12 (Apr 3 is Good Friday - no class on Friday, but MUS 210 is MW so not affected)
('2026c613-bda7-487a-a5d9-91e57c26a741', 21, '2026-04-06', '2026-04-06T14:00:00-05:00', '2026-04-06T14:50:00-05:00', 'MUS 210 - Session 21: World Choral Traditions', 12, 'planned'),
('2026c613-bda7-487a-a5d9-91e57c26a741', 22, '2026-04-08', '2026-04-08T14:00:00-05:00', '2026-04-08T14:50:00-05:00', 'MUS 210 - Session 22: Women in Choral Music', 12, 'planned'),
-- Week 13
('2026c613-bda7-487a-a5d9-91e57c26a741', 23, '2026-04-13', '2026-04-13T14:00:00-05:00', '2026-04-13T14:50:00-05:00', 'MUS 210 - Session 23: Program Building', 13, 'planned'),
('2026c613-bda7-487a-a5d9-91e57c26a741', 24, '2026-04-15', '2026-04-15T14:00:00-05:00', '2026-04-15T14:50:00-05:00', 'MUS 210 - Session 24: Concert Production', 13, 'planned'),
-- Week 14
('2026c613-bda7-487a-a5d9-91e57c26a741', 25, '2026-04-20', '2026-04-20T14:00:00-05:00', '2026-04-20T14:50:00-05:00', 'MUS 210 - Session 25: Final Project Prep', 14, 'planned'),
('2026c613-bda7-487a-a5d9-91e57c26a741', 26, '2026-04-22', '2026-04-22T14:00:00-05:00', '2026-04-22T14:50:00-05:00', 'MUS 210 - Session 26: Final Project Presentations I', 14, 'planned'),
-- Week 15
('2026c613-bda7-487a-a5d9-91e57c26a741', 27, '2026-04-27', '2026-04-27T14:00:00-05:00', '2026-04-27T14:50:00-05:00', 'MUS 210 - Session 27: Final Project Presentations II', 15, 'planned'),
('2026c613-bda7-487a-a5d9-91e57c26a741', 28, '2026-04-29', '2026-04-29T14:00:00-05:00', '2026-04-29T14:50:00-05:00', 'MUS 210 - Session 28: Course Wrap-Up & Reflection', 15, 'planned');

-- Update the syllabus with the full 15-week schedule
UPDATE gw_syllabus_templates 
SET weekly_schedule = '[
  {"week": "Week 1", "topics": "Conducting Fundamentals: Posture, Window & Basic Meters", "readings": "Conducting Fundamentals page – preparatory position, window, conducting floor and rebound", "assignments": "Conducting Fundamentals Exercise, Glossary Quiz prep, Self-Reflection Journal"},
  {"week": "Week 2", "topics": "Dynamics, Expression & Cueing", "readings": "Dynamics & Expression pages on conducting.gleeworld.org", "assignments": "Beat pattern video submission, Cueing exercise"},
  {"week": "Week 3", "topics": "Score Study & Choral Voicing", "readings": "Score analysis methodology", "assignments": "Score markup assignment, Voicing diagram"},
  {"week": "Week 4", "topics": "Rehearsal Techniques", "readings": "Rehearsal planning strategies", "assignments": "Rehearsal plan draft, Observation report"},
  {"week": "Week 5", "topics": "Blend, Balance & Diction", "readings": "Choral tone production", "assignments": "Diction IPA exercise, Blend analysis"},
  {"week": "Week 6", "topics": "Historical Periods in Choral Music", "readings": "Renaissance through Romantic periods", "assignments": "Era comparison paper, Style analysis"},
  {"week": "Week 7", "topics": "Midterm Review & Exam", "readings": "All previous materials", "assignments": "Midterm Conducting Exam"},
  {"week": "Week 8", "topics": "SPRING BREAK - No Classes", "readings": "", "assignments": ""},
  {"week": "Week 9", "topics": "Contemporary & African American Spirituals", "readings": "History of African American sacred music", "assignments": "Spiritual analysis, Conducting video"},
  {"week": "Week 10", "topics": "Gospel Music Traditions", "readings": "Gospel music history and practice", "assignments": "Gospel conducting demonstration"},
  {"week": "Week 11", "topics": "Jazz, Pop & A Cappella", "readings": "Contemporary choral arranging", "assignments": "Arrangement analysis, A cappella project start"},
  {"week": "Week 12", "topics": "World Traditions & Women in Choral Music", "readings": "Global choral traditions", "assignments": "Comparative essay, Composer spotlight"},
  {"week": "Week 13", "topics": "Program Building & Concert Production", "readings": "Concert programming principles", "assignments": "Program proposal, Production checklist"},
  {"week": "Week 14", "topics": "Final Project Preparation & Presentations I", "readings": "Peer review materials", "assignments": "Final conducting project"},
  {"week": "Week 15", "topics": "Final Presentations & Course Wrap-Up", "readings": "", "assignments": "Final reflection paper"}
]'::jsonb,
updated_at = NOW()
WHERE course_id = '2026c613-bda7-487a-a5d9-91e57c26a741';

-- Update the course dates
UPDATE gw_courses 
SET start_date = '2026-01-14', 
    end_date = '2026-04-29',
    term = 'Spring 2026',
    semester = 'Spring 2026'
WHERE id = '2026c613-bda7-487a-a5d9-91e57c26a741';