-- Update MUS 210 syllabus with the detailed 15-week course outline from the PDF
UPDATE gw_syllabus_templates 
SET 
  purpose = 'This course uses the Conductor''s Reference Guide on GleeWorld (conducting.gleeworld.org) as a comprehensive "textbook" for choral conducting and literature. Students meet for 2 credit hours per week and develop conducting technique, musicianship, historical awareness, theory, cultural sensitivity, self-reflection and communication skills. Each week pairs technical conducting exercises with deep study of choral styles, notation and repertoire.',
  weekly_schedule = '[
  {
    "week": "Week 1: Jan 14 & 21",
    "topics": "Conducting Fundamentals: Posture, Window & Basic Meters – Proper conducting stance and preparatory position; establishing the conducting window; basic beat patterns and rebound; reading common tempo/dynamic terms.",
    "readings": "Conducting Fundamentals – preparatory position, window, conducting floor and rebound; beat pattern diagrams for 2-, 3- and 4-beat meters. Score Terminology – Tempo Markings.",
    "assignments": "Conducting Fundamentals Exercise (video), Glossary Quiz (10 Italian terms), Self-Reflection Journal"
  },
  {
    "week": "Week 2: Jan 26 & 28",
    "topics": "The Conductor as Leader & Basic Patterns Review – Role of the conductor as musical leader; independence of hands; establishing tempo; review of 2-, 3-, 4-beat patterns; introduction to cueing and gesture of syncopation.",
    "readings": "History of Conducting – Ancient & Medieval Origins, Classical Period transition to baton. Conducting Fundamentals – preparatory beat and rebound.",
    "assignments": "Group Presentation: Conductor''s Role, Conducting Exercise 1 (basic patterns), Reflection on communication"
  },
  {
    "week": "Week 3: Feb 2 & 4",
    "topics": "Score Notation & Warm-ups – Interpreting voicing, clefs and text underlay; writing rehearsal warm-ups; independence of hands; practicing cueing entrances.",
    "readings": "Choral Conventions – Notational (SATB, SSA, TTBB designations, clef usage, syllabic vs. melismatic text). Conducting Fundamentals – cueing and left-hand independence.",
    "assignments": "Conducting Exercise 2 (preparatory beats/cutoffs), Warm-up #1 (vowels/consonants), Notation Worksheet"
  },
  {
    "week": "Week 4: Feb 9 & 11",
    "topics": "Renaissance Era: History & Repertoire – Humanism and sacred vs. secular forms (mass, motet, madrigal); Renaissance notation; listening to Palestrina and Josquin.",
    "readings": "History of Choral Music – Renaissance (polyphonic music, Dufay, Josquin, Palestrina). Choral Conventions – Historical Performance.",
    "assignments": "Renaissance Presentation (oral + one-page paper), Listening Journal (Renaissance motet), Technique Practice (steady tactus)"
  },
  {
    "week": "Week 5: Feb 16 & 18",
    "topics": "Renaissance Conducting – Conduct a Renaissance piece with attention to imitative entrances, text stress and modal tuning. Review left-hand independence, cueing and release gestures.",
    "readings": "Revisit Renaissance conducting techniques and notation.",
    "assignments": "RENAISSANCE CONDUCTING EXAM – demonstrate stylistic interpretation, vowel purity and blend"
  },
  {
    "week": "Week 6: Feb 23 & 25",
    "topics": "Baroque Era: History & Warm-ups – Historical context (opera, oratorio, cantata); reading figured bass; Baroque articulation (dotted rhythms, dance forms).",
    "readings": "History of Choral Music – Baroque (basso continuo, terraced dynamics, Monteverdi, Bach). Conducting Fundamentals – gesture of syncopation.",
    "assignments": "Baroque Presentation (oral + one-page paper), Warm-up #2 (Baroque-inspired agility/ornamentation)"
  },
  {
    "week": "Week 7: Mar 2 & 4",
    "topics": "Baroque Conducting – Practice 4-beat and compound (3/8, 6/8) patterns; emphasise terraced dynamics, tempo flexibility, and appropriate ornamentation.",
    "readings": "Baroque conducting techniques and ornamentation practices.",
    "assignments": "BAROQUE CONDUCTING EXAM – stylistic interpretation with clear gestures for phrasing and dynamic contrasts"
  },
  {
    "week": "Week 8: Mar 9–13",
    "topics": "SPRING BREAK – No Classes",
    "readings": "",
    "assignments": ""
  },
  {
    "week": "Week 9: Mar 16 & 18",
    "topics": "Classical Era: History & Advanced Patterns – Enlightenment ideals; forms (mass, requiem); classical articulation; advanced patterns (5/4, 6/8); shaping dynamics.",
    "readings": "History of Choral Music – Classical (Haydn, Mozart, balanced phrases, homophonic textures). Conducting Fundamentals – 5- and 6-beat meters.",
    "assignments": "Conducting Exercise 3 (5- and 6-beat patterns), Classical Presentation (oral + hand-out)"
  },
  {
    "week": "Week 10: Mar 23 & 25",
    "topics": "Classical Conducting – Conduct classical works (Haydn, Mozart) emphasising balanced phrasing and dynamic contrast. Refine baton technique, cutoffs and releases.",
    "readings": "Classical conducting and phrasing techniques.",
    "assignments": "CLASSICAL CONDUCTING EXAM – balance, phrasing, dynamic contrast. Warm-up #3 (classical phrasing)"
  },
  {
    "week": "Week 11: Mar 30 & Apr 1",
    "topics": "Romantic Era: History & Expression – Romantic aesthetics; rubato and expressive gesture; programmatic texts; extended chromaticism. Conductor as interpretive artist.",
    "readings": "History of Choral Music – Romantic (Brahms, Verdi, larger ensembles, chromatic harmony). History of Conducting – Romantic Era.",
    "assignments": "Romantic Presentation (oral + paper), Listening Journal (Brahms Requiem), Self-awareness Reflection"
  },
  {
    "week": "Week 12: Apr 6 & 8",
    "topics": "Romantic Conducting & 20th-Century Introduction – Expressive gestures, rubato, dramatic interpretation. Introduction to atonality, minimalism, extended techniques.",
    "readings": "History of Choral Music – 20th Century & Contemporary. Romantic conducting practices.",
    "assignments": "ROMANTIC CONDUCTING EXAM – expressive gestures and dramatic interpretation with self-assessment"
  },
  {
    "week": "Week 13: Apr 13 & 15",
    "topics": "Negro Spirituals: History, Culture & Techniques – Historical context and significance; cultural appropriation vs. appreciation; call-and-response; syncopated conducting gestures.",
    "readings": "History of Choral Music – Negro Spirituals (pentatonic melodies, syncopation). Choral Conventions – Black Choral Music. Conducting Fundamentals – gesture of syncopation.",
    "assignments": "Conducting Exercise 4 (left-hand independence, syncopation), Negro Spiritual Presentation (oral + paper), Warm-up #4 (call-and-response), Discussion Post on cultural sensitivity"
  },
  {
    "week": "Week 14: Apr 20 & 22",
    "topics": "Negro Spiritual & Gospel Music – Conduct spirituals with rhythmic vitality and authentic call-and-response. Gospel history, performance practice (improvisation, hand claps).",
    "readings": "History of Choral Music – Gospel (blues-influenced melodies, improvisation). Choral Conventions – Black Choral Music (groove-based tempos).",
    "assignments": "NEGRO SPIRITUAL CONDUCTING EXAM with cultural reflection, Gospel Presentation (oral + paper), Warm-up #5 (gospel groove/energy)"
  },
  {
    "week": "Week 15: Apr 27 & 29",
    "topics": "Gospel Conducting & Final Review – Conduct gospel works with energy, call-and-response awareness, stylistic authenticity. Course wrap-up and portfolio review.",
    "readings": "Gospel and contemporary CCM conducting techniques.",
    "assignments": "GOSPEL CONDUCTING EXAM – energy, call-and-response, authenticity"
  }
]'::jsonb,
  grading_breakdown = '[
    {"category": "Conducting Exams (Weeks 5, 7, 10, 12, 14, 15)", "percentage": 40},
    {"category": "Presentations & Papers", "percentage": 20},
    {"category": "Warm-ups & Written Assignments", "percentage": 15},
    {"category": "Final Project & Portfolio", "percentage": 15},
    {"category": "Written Final Exam", "percentage": 10}
  ]'::jsonb,
  updated_at = NOW()
WHERE course_id = '2026c613-bda7-487a-a5d9-91e57c26a741';