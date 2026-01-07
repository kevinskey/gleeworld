-- Update the syllabus with real dates for Spring 2026
UPDATE gw_syllabus_templates 
SET weekly_schedule = '[
  {"week": "Week 1: Jan 14 & 21", "topics": "Conducting Fundamentals: Posture, Window & Basic Meters", "readings": "Conducting Fundamentals page – preparatory position, window, conducting floor and rebound", "assignments": "Conducting Fundamentals Exercise, Glossary Quiz prep, Self-Reflection Journal"},
  {"week": "Week 2: Jan 26 & 28", "topics": "Dynamics, Expression & Cueing", "readings": "Dynamics & Expression pages on conducting.gleeworld.org", "assignments": "Beat pattern video submission, Cueing exercise"},
  {"week": "Week 3: Feb 2 & 4", "topics": "Score Study & Choral Voicing", "readings": "Score analysis methodology", "assignments": "Score markup assignment, Voicing diagram"},
  {"week": "Week 4: Feb 9 & 11", "topics": "Rehearsal Techniques", "readings": "Rehearsal planning strategies", "assignments": "Rehearsal plan draft, Observation report"},
  {"week": "Week 5: Feb 16 & 18", "topics": "Blend, Balance & Diction", "readings": "Choral tone production", "assignments": "Diction IPA exercise, Blend analysis"},
  {"week": "Week 6: Feb 23 & 25", "topics": "Historical Periods in Choral Music", "readings": "Renaissance through Romantic periods", "assignments": "Era comparison paper, Style analysis"},
  {"week": "Week 7: Mar 2 & 4", "topics": "Midterm Review & Exam", "readings": "All previous materials", "assignments": "Midterm Conducting Exam"},
  {"week": "Week 8: Mar 9–13", "topics": "SPRING BREAK – No Classes", "readings": "", "assignments": ""},
  {"week": "Week 9: Mar 16 & 18", "topics": "Contemporary & African American Spirituals", "readings": "History of African American sacred music", "assignments": "Spiritual analysis, Conducting video"},
  {"week": "Week 10: Mar 23 & 25", "topics": "Gospel Music Traditions", "readings": "Gospel music history and practice", "assignments": "Gospel conducting demonstration"},
  {"week": "Week 11: Mar 30 & Apr 1", "topics": "Jazz, Pop & A Cappella", "readings": "Contemporary choral arranging", "assignments": "Arrangement analysis, A cappella project start"},
  {"week": "Week 12: Apr 6 & 8", "topics": "World Traditions & Women in Choral Music", "readings": "Global choral traditions", "assignments": "Comparative essay, Composer spotlight"},
  {"week": "Week 13: Apr 13 & 15", "topics": "Program Building & Concert Production", "readings": "Concert programming principles", "assignments": "Program proposal, Production checklist"},
  {"week": "Week 14: Apr 20 & 22", "topics": "Final Project Preparation & Presentations I", "readings": "Peer review materials", "assignments": "Final conducting project"},
  {"week": "Week 15: Apr 27 & 29", "topics": "Final Presentations & Course Wrap-Up", "readings": "", "assignments": "Final reflection paper"}
]'::jsonb,
updated_at = NOW()
WHERE course_id = '2026c613-bda7-487a-a5d9-91e57c26a741';