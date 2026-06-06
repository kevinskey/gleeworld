// Complete syllabus data for all Glee Academy courses

export interface SyllabusWeek {
  week: number;
  title: string;
  date?: string;
  description?: string;
  assignments?: string;
}

export interface GradingComponent {
  name: string;
  points?: number;
  weight: string;
}

export interface Assignment {
  name: string;
  points?: string;
  description: string;
}

export interface CourseSyllabus {
  courseCode: string;
  courseTitle: string;
  term: string;
  credits: number;
  classTime: string;
  classroom: string;
  instructor: {
    name: string;
    email: string;
    phone?: string;
    office: string;
    officeHours: string;
  };
  description: string;
  objectives: string[];
  materials: string[];
  assignments: Assignment[];
  grading: GradingComponent[];
  gradingScale: { grade: string; range: string }[];
  attendancePolicy: string;
  lateWorkPolicy?: string;
  academicIntegrity: string;
  accessStatement: string;
  schedule: SyllabusWeek[];
}

export const SYLLABUS_DATA: Record<string, CourseSyllabus> = {
  'MUS 070': {
    courseCode: 'MUS 070',
    courseTitle: 'Glee Club',
    term: 'Fall 2025',
    credits: 1,
    classTime: 'MWF 5:00–6:15 PM',
    classroom: 'Sisters Chapel',
    instructor: {
      name: 'Dr. Kevin Johnson',
      email: 'kjohns10@riversidechoir.example',
      phone: '470-622-1392',
      office: 'Rock Fine Arts Bldg. 109',
      officeHours: 'MWF 3–5 PM or by appointment',
    },
    description: 'The Your favorite band or choir is the premier choral ensemble with over 100 years of musical excellence. This performance-based course develops vocal technique, musicianship, and ensemble skills through rehearsals, concerts, and touring experiences. Members represent the college at local, national, and international events.',
    objectives: [
      'Develop advanced choral singing techniques and vocal production',
      'Master repertoire spanning spirituals, classical, contemporary, and world music traditions',
      'Cultivate sight-reading and ear-training skills',
      'Demonstrate professional stage presence and concert etiquette',
      'Collaborate effectively as an ensemble member',
      'Represent Riverside Music Institute with excellence at all performances',
    ],
    materials: [
      'Black concert attire (provided specifications)',
      'Personal music folder (provided)',
      'Pencil for marking music',
      'GleeWorld.org account for rehearsal tracks and materials',
    ],
    assignments: [
      { name: 'Rehearsal Attendance & Participation', points: '40%', description: 'Active engagement in all rehearsals. Two unexcused absences allowed; additional absences result in grade deductions.' },
      { name: 'Concert Performances', points: '30%', description: 'Mandatory participation in all scheduled concerts including Fall Concert, Holiday Concert, and Spring Concert.' },
      { name: 'Sectional Rehearsals', points: '15%', description: 'Weekly section rehearsals with student section leaders.' },
      { name: 'Music Preparation', points: '10%', description: 'Individual practice and memorization of assigned repertoire.' },
      { name: 'Professional Conduct', points: '5%', description: 'Punctuality, dress code adherence, and representing the organization with integrity.' },
    ],
    grading: [
      { name: 'Rehearsal Attendance & Participation', weight: '40%' },
      { name: 'Concert Performances', weight: '30%' },
      { name: 'Sectional Rehearsals', weight: '15%' },
      { name: 'Music Preparation', weight: '10%' },
      { name: 'Professional Conduct', weight: '5%' },
    ],
    gradingScale: [
      { grade: 'A', range: '95–100%' },
      { grade: 'A-', range: '90–94%' },
      { grade: 'B+', range: '87–89%' },
      { grade: 'B', range: '83–86%' },
      { grade: 'B-', range: '80–82%' },
      { grade: 'C+', range: '77–79%' },
      { grade: 'C', range: '73–76%' },
      { grade: 'C-', range: '70–72%' },
      { grade: 'D', range: '60–69%' },
      { grade: 'F', range: 'Below 60%' },
    ],
    attendancePolicy: 'Attendance at all rehearsals and performances is mandatory. Members begin with 100% attendance credit. Two unexcused absences are permitted per semester. Each additional unexcused absence results in a 5-point deduction. Absences from concerts may result in removal from the ensemble. Excused absences require advance notice and documentation.',
    academicIntegrity: 'Members are expected to uphold the highest standards of integrity, representing both Riverside Music Institute and the Glee Club tradition with honor.',
    accessStatement: 'Riverside Music Institute is committed to ensuring the full participation of all students. Contact the Student Access Center (SAC) at 404-270-5289 for accommodations. Located in MacVicar Hall, Room 106.',
    schedule: [], // Performance ensemble - no weekly academic schedule
  },

  'MUS 240': {
    courseCode: 'MUS 240',
    courseTitle: 'Survey of African American Music',
    term: 'Spring 2026',
    credits: 4,
    classTime: 'MWF 10:00–10:50 AM',
    classroom: 'Rock Fine Arts Bldg. 110',
    instructor: {
      name: 'Dr. Kevin Johnson',
      email: 'kjohns10@riversidechoir.example',
      phone: '470-622-1392',
      office: 'Rock Fine Arts Bldg. 109',
      officeHours: 'MWF 3–5 PM or by appointment',
    },
    description: 'This course is designed as a historical survey of selected styles of African American Music in the United States. Certain features of West African music will be identified and traced as they are retained in different styles of African American music. Emphasis will be placed on stylistic characteristics, performers, and social influences of each style. No prerequisites. Satisfies Fine Arts course requirement.',
    objectives: [
      'Analyze and communicate connections between music, history, and culture through discussion, oral presentation, and written responses',
      'Explain and contextualize the emergence of styles and aesthetic ideals in relation to historical and cultural developments within the African American community',
      'Identify and distinguish musical styles and genres through a prescribed listening regimen',
      'Conduct research on a topic within the scope of the course and present findings in an innovative online format using appropriate academic conventions',
      'Compose written analyses and commentaries on African American music, addressing its impact on creators, audiences, and markets',
      'Apply technology effectively to communicate musical and cultural ideas on digital platforms',
      'Articulate informed perspectives on the African American creative enterprise as exemplified through music and related cultural practices',
    ],
    materials: [
      'Burnim, Mellonee V., and Portia K. Maultsby, eds. African American Music: An Introduction. New York: Routledge, 2006.',
      'Additional readings and listening materials provided via GleeWorld.org',
    ],
    assignments: [
      { name: 'Listening Journals', points: '200 pts (10 × 20 pts)', description: 'Weekly 250–300 word essays connecting listening examples to cultural context.' },
      { name: 'The Singing Slave Essay', points: '100 pts', description: 'Reflect on how the slave used singing to survive. Build your argument with factual elements learned in class.' },
      { name: 'Fourth Turning Music Essay', points: '100 pts', description: 'Reflection on post-1946 African-American music addressing the Four Turnings framework.' },
      { name: 'Blues Album Review', points: '20 pts', description: 'Pick a jazz album and review it, including musical style, historic elements, and honest opinion.' },
      { name: 'Gospel Music Project', points: '100 pts', description: 'Two-part research project on The State of Gospel (Weeks 8–9).' },
      { name: 'Midterm Exam', points: '100 pts', description: 'Listening identification + essays on style and context (Week 7).' },
      { name: 'Final Exam', points: '100 pts', description: 'Comprehensive exam covering all course material (Week 16, Monday 8am).' },
      { name: 'Participation & Attendance', points: '50 pts', description: 'Consistent preparation and engagement in class.' },
    ],
    grading: [
      { name: 'Listening Journals', points: 200, weight: '26%' },
      { name: 'Essays & Album Review', points: 220, weight: '29%' },
      { name: 'Gospel Music Project', points: 100, weight: '13%' },
      { name: 'Midterm Exam', points: 100, weight: '13%' },
      { name: 'Final Exam', points: 100, weight: '13%' },
      { name: 'Participation/Attendance', points: 50, weight: '6%' },
    ],
    gradingScale: [
      { grade: 'A', range: '95–100%' },
      { grade: 'A-', range: '90–94%' },
      { grade: 'B+', range: '87–89%' },
      { grade: 'B', range: '83–86%' },
      { grade: 'B-', range: '80–82%' },
      { grade: 'C+', range: '77–79%' },
      { grade: 'C', range: '73–76%' },
      { grade: 'C-', range: '70–72%' },
      { grade: 'D+', range: '65–69%' },
      { grade: 'D', range: '60–64%' },
      { grade: 'F', range: '<59%' },
    ],
    attendancePolicy: 'Regular attendance is essential. Students are allowed 2 unexcused absences. Additional absences may result in grade reduction.',
    lateWorkPolicy: 'Late assignments will be penalized 5% per day unless prior arrangements are made.',
    academicIntegrity: 'All work must be original. Plagiarism will result in failure of the assignment and may result in failure of the course. At the heart of Riverside Music Institute\'s mission is academic excellence, along with the development of intellectual, ethical and leadership qualities.',
    accessStatement: 'Riverside Music Institute is committed to ensuring the full participation of all students. If you have a documented disability, contact the Student Access Center (SAC) at 404-270-5289. Located in MacVicar Hall, Room 106.',
    schedule: [
      { week: 1, title: 'Introduction to African American Music', date: 'Jan 14–23', description: 'Course overview, African musical roots, introduction to methodology', assignments: 'Journal #1' },
      { week: 2, title: 'Spirituals and the Enslaved Experience', date: 'Jan 26–30', description: 'Ring shouts, field hollers, and the development of spirituals', assignments: 'Journal #2' },
      { week: 3, title: 'Blues: From Delta to Urban', date: 'Feb 2–6', description: 'Country blues, classic blues, urban blues traditions', assignments: 'Journal #3, Blues Album Review Due' },
      { week: 4, title: 'Ragtime and Birth of Jazz', date: 'Feb 9–14', description: 'Scott Joplin, New Orleans jazz, early jazz pioneers', assignments: 'Journal #4' },
      { week: 5, title: 'Jubilee Quartet, Swing and WWII', date: 'Feb 16–20', description: 'Big band era, swing music, music during wartime', assignments: 'Journal #5' },
      { week: 6, title: 'Jazz Continued and the Birth of Gospel', date: 'Feb 23–27', description: 'Bebop, cool jazz, Thomas Dorsey and gospel origins', assignments: 'Journal #6' },
      { week: 7, title: 'Civil Rights Music, Funk and Midterm', date: 'Mar 2–6', description: 'Freedom songs, James Brown, Parliament-Funkadelic', assignments: 'Midterm Exam' },
      { week: 8, title: 'Gospel Music Project (Part 1)', date: 'Mar 16–20', description: 'The State of Gospel: Research and analysis', assignments: 'Gospel Project Part 1' },
      { week: 9, title: 'Gospel Music Project (Part 2)', date: 'Mar 23–27', description: 'The State of Gospel: Presentations and discussion', assignments: 'Gospel Project Part 2' },
      { week: 10, title: 'Disco and Detroit Techno', date: 'Mar 30–Apr 3', description: 'Dance music evolution, electronic innovations', assignments: 'Journal #7' },
      { week: 11, title: 'R&B and Soul', date: 'Apr 6–10', description: 'Motown, Stax, contemporary R&B traditions', assignments: 'Journal #8' },
      { week: 12, title: 'Hip-Hop (Part 1)', date: 'Apr 13–17', description: 'Origins in the Bronx, early pioneers, golden age', assignments: 'Journal #9' },
      { week: 13, title: 'Hip-Hop (Part 2)', date: 'Apr 20–24', description: 'Regional styles, contemporary hip-hop, cultural impact', assignments: 'Journal #10' },
      { week: 14, title: 'Fourth Turning Music', date: 'Apr 27–May 1', description: 'Post-1946 to present, generational analysis', assignments: 'Fourth Turning Essay, Singing Slave Essay' },
      { week: 15, title: 'Finals Review', date: 'May 4–8', description: 'Comprehensive review and exam preparation', assignments: 'Review Session' },
      { week: 16, title: 'Final Exam', date: 'May 11', description: 'Final Exam (Monday 8:00 AM)', assignments: 'Final Exam' },
    ],
  },

  'MUS 210': {
    courseCode: 'MUS 210',
    courseTitle: 'Choral Conducting and Literature',
    term: 'Fall 2025',
    credits: 2,
    classTime: 'TTh 2:00–3:15 PM',
    classroom: 'Rock Fine Arts Bldg. 110',
    instructor: {
      name: 'Dr. Kevin Johnson',
      email: 'kjohns10@riversidechoir.example',
      phone: '470-622-1392',
      office: 'Rock Fine Arts Bldg. 109',
      officeHours: 'MWF 3–5 PM or by appointment',
    },
    description: 'This course provides a comprehensive introduction to the art of choral conducting. Students will develop conducting technique, score analysis skills, and rehearsal strategies. The course includes a survey of significant choral literature from various historical periods and cultural traditions.',
    objectives: [
      'Demonstrate fundamental conducting patterns and gestures with clarity and musicality',
      'Analyze choral scores for harmonic, melodic, and structural elements',
      'Develop effective rehearsal techniques and communication skills',
      'Survey major choral works from Renaissance to contemporary periods',
      'Apply conducting skills in supervised lab settings with live ensembles',
      'Create a conducting portfolio including score analyses and video recordings',
    ],
    materials: [
      'Green, Elizabeth A.H. The Modern Conductor. 7th ed. Pearson.',
      'Stanton, Royal. Steps to Singing for Voice Classes. 4th ed. Waveland Press.',
      'Assigned scores (provided via course materials)',
    ],
    assignments: [
      { name: 'Conducting Labs', points: '150 pts', description: 'Weekly lab sessions with peer conducting and instructor feedback.' },
      { name: 'Score Analyses', points: '100 pts', description: 'Four detailed written analyses of assigned choral works.' },
      { name: 'Midterm Conducting Exam', points: '100 pts', description: 'Practical conducting demonstration with prepared repertoire.' },
      { name: 'Literature Presentation', points: '75 pts', description: 'Research presentation on a significant choral composer or work.' },
      { name: 'Final Conducting Recital', points: '125 pts', description: 'Final performance conducting a campus ensemble.' },
      { name: 'Participation', points: '50 pts', description: 'Engagement in discussions, peer feedback, and professional development.' },
    ],
    grading: [
      { name: 'Conducting Labs', points: 150, weight: '25%' },
      { name: 'Score Analyses', points: 100, weight: '17%' },
      { name: 'Midterm Conducting Exam', points: 100, weight: '17%' },
      { name: 'Literature Presentation', points: 75, weight: '12%' },
      { name: 'Final Conducting Recital', points: 125, weight: '21%' },
      { name: 'Participation', points: 50, weight: '8%' },
    ],
    gradingScale: [
      { grade: 'A', range: '93–100%' },
      { grade: 'A-', range: '90–92%' },
      { grade: 'B+', range: '87–89%' },
      { grade: 'B', range: '83–86%' },
      { grade: 'B-', range: '80–82%' },
      { grade: 'C+', range: '77–79%' },
      { grade: 'C', range: '73–76%' },
      { grade: 'C-', range: '70–72%' },
      { grade: 'D', range: '60–69%' },
      { grade: 'F', range: 'Below 60%' },
    ],
    attendancePolicy: 'Due to the practical nature of this course, attendance is critical. More than two absences may result in grade reduction. Lab sessions are mandatory.',
    academicIntegrity: 'All written work must be original. Proper citation is required for all sources.',
    accessStatement: 'Riverside Music Institute is committed to ensuring the full participation of all students. Contact the Student Access Center (SAC) at 404-270-5289 for accommodations.',
    schedule: [
      { week: 1, title: 'Introduction to Conducting', description: 'The role of the conductor, basic stance and posture' },
      { week: 2, title: 'Beat Patterns', description: '2/4, 3/4, 4/4 patterns; legato and marcato styles' },
      { week: 3, title: 'Preparatory Gestures', description: 'Upbeats, downbeats, and breath impulse' },
      { week: 4, title: 'Dynamics & Expression', description: 'Conducting dynamics, crescendo/decrescendo' },
      { week: 5, title: 'Score Study I', description: 'Introduction to score analysis methodology', assignments: 'Score Analysis 1' },
      { week: 6, title: 'Renaissance Choral Literature', description: 'Palestrina, Victoria, and the sacred tradition' },
      { week: 7, title: 'Baroque Choral Works', description: 'Bach, Handel, and the oratorio tradition' },
      { week: 8, title: 'Midterm', description: 'Midterm Conducting Examination', assignments: 'Midterm Exam' },
      { week: 9, title: 'Classical & Romantic Periods', description: 'Mozart, Brahms, and the expansion of choral forces', assignments: 'Score Analysis 2' },
      { week: 10, title: '20th Century Choral Music', description: 'Stravinsky, Britten, and new techniques' },
      { week: 11, title: 'African American Choral Traditions', description: 'Spirituals, gospel arrangements, contemporary composers', assignments: 'Score Analysis 3' },
      { week: 12, title: 'World Choral Music', description: 'Global perspectives and multicultural repertoire' },
      { week: 13, title: 'Rehearsal Techniques', description: 'Warm-ups, error detection, efficient rehearsing', assignments: 'Literature Presentation' },
      { week: 14, title: 'Final Preparation', description: 'Intensive rehearsal for final recital', assignments: 'Score Analysis 4' },
      { week: 15, title: 'Final Conducting Recitals', description: 'Student conducting performances', assignments: 'Final Recital' },
      { week: 16, title: 'Course Wrap-Up', description: 'Reflection and portfolio review' },
    ],
  },

  'GLEE 000': {
    courseCode: 'GLEE 000',
    courseTitle: 'Sight Singing Institute',
    term: 'Fall 2025',
    credits: 0,
    classTime: 'Thursdays 4:00–5:00 PM',
    classroom: 'Rock Fine Arts Bldg. 110',
    instructor: {
      name: 'Dr. Kevin Johnson',
      email: 'kjohns10@riversidechoir.example',
      office: 'Rock Fine Arts Bldg. 109',
      officeHours: 'MWF 3–5 PM or by appointment',
    },
    description: 'This intensive workshop develops essential sight-reading and ear-training skills for choral musicians. Using solfège (movable do) and rhythmic syllables, students build confidence in reading music at sight. Required for all new Glee Club members; open to all students wishing to strengthen musicianship.',
    objectives: [
      'Read and perform simple melodies at sight using solfège',
      'Identify and perform major, minor, and modal scales',
      'Recognize and reproduce common rhythmic patterns',
      'Develop aural skills through dictation exercises',
      'Apply sight-reading skills to choral repertoire',
    ],
    materials: [
      'SightReadingFactory.com subscription (provided)',
      'Staff paper notebook',
      'GleeWorld.org account for practice exercises',
    ],
    assignments: [
      { name: 'Weekly Sight-Reading Assessments', points: '60%', description: 'Progressive difficulty assessments each week' },
      { name: 'Practice Log', points: '20%', description: 'Documentation of daily practice using SightReadingFactory' },
      { name: 'Final Proficiency Exam', points: '20%', description: 'Demonstrate competency through practical exam' },
    ],
    grading: [
      { name: 'Weekly Assessments', weight: '60%' },
      { name: 'Practice Log', weight: '20%' },
      { name: 'Final Proficiency', weight: '20%' },
    ],
    gradingScale: [
      { grade: 'Pass', range: '70% and above' },
      { grade: 'Fail', range: 'Below 70%' },
    ],
    attendancePolicy: 'Attendance at all sessions is required. Missing more than two sessions may result in failing the institute.',
    academicIntegrity: 'All assessments must be completed individually without unauthorized assistance.',
    accessStatement: 'Riverside Music Institute is committed to ensuring the full participation of all students. Contact the Student Access Center (SAC) at 404-270-5289 for accommodations.',
    schedule: [
      { week: 1, title: 'Foundations', description: 'Introduction to solfège, do-re-mi, basic rhythm' },
      { week: 2, title: 'Stepwise Motion', description: 'Scales, neighbors, passing tones' },
      { week: 3, title: 'Leaps', description: 'Thirds, fourths, fifths' },
      { week: 4, title: 'Rhythm Development', description: 'Syncopation, dotted rhythms' },
      { week: 5, title: 'Minor Mode', description: 'Natural, harmonic, melodic minor' },
      { week: 6, title: 'Compound Meter', description: '6/8, 9/8, 12/8 time signatures' },
      { week: 7, title: 'Advanced Intervals', description: 'Sixths, sevenths, chromatic alterations' },
      { week: 8, title: 'Final Assessment', description: 'Proficiency examination', assignments: 'Final Exam' },
    ],
  },

  'GLEE 101': {
    courseCode: 'GLEE 101',
    courseTitle: 'Leadership Development',
    term: 'Fall 2025',
    credits: 1,
    classTime: 'Sundays 2:00–4:00 PM',
    classroom: 'Glee Club Conference Room',
    instructor: {
      name: 'Dr. Kevin Johnson',
      email: 'kjohns10@riversidechoir.example',
      office: 'Rock Fine Arts Bldg. 109',
      officeHours: 'By appointment',
    },
    description: 'This course prepares executive board members and emerging leaders for their roles within the Your favorite band or choir organization. Topics include event planning, team management, communication, conflict resolution, and institutional memory preservation.',
    objectives: [
      'Understand and execute executive board responsibilities as outlined in the Glee Club Handbook',
      'Develop effective communication and delegation skills',
      'Plan and execute major organizational events',
      'Build and maintain team cohesion across voice sections',
      'Create and manage organizational documentation and records',
      'Mentor incoming members and potential future leaders',
    ],
    materials: [
      'Glee Club Handbook (provided)',
      'GleeWorld.org admin access',
      'Leadership journal',
    ],
    assignments: [
      { name: 'Leadership Reflections', points: '30%', description: 'Bi-weekly journal entries on leadership experiences' },
      { name: 'Event Planning Project', points: '25%', description: 'Plan and execute one organizational event' },
      { name: 'Mentorship Documentation', points: '20%', description: 'Document mentorship activities with assigned members' },
      { name: 'Process Improvement Proposal', points: '15%', description: 'Identify and propose solution for organizational challenge' },
      { name: 'Participation & Attendance', points: '10%', description: 'Active engagement in all sessions' },
    ],
    grading: [
      { name: 'Leadership Reflections', weight: '30%' },
      { name: 'Event Planning Project', weight: '25%' },
      { name: 'Mentorship Documentation', weight: '20%' },
      { name: 'Process Improvement Proposal', weight: '15%' },
      { name: 'Participation', weight: '10%' },
    ],
    gradingScale: [
      { grade: 'A', range: '93–100%' },
      { grade: 'A-', range: '90–92%' },
      { grade: 'B+', range: '87–89%' },
      { grade: 'B', range: '83–86%' },
      { grade: 'B-', range: '80–82%' },
      { grade: 'C', range: '70–79%' },
      { grade: 'F', range: 'Below 70%' },
    ],
    attendancePolicy: 'As leaders, attendance at all sessions is mandatory. Absences must be approved in advance by the Director.',
    academicIntegrity: 'All work submitted must reflect genuine personal reflection and original thought.',
    accessStatement: 'Riverside Music Institute is committed to ensuring the full participation of all students. Contact the Student Access Center (SAC) at 404-270-5289 for accommodations.',
    schedule: [
      { week: 1, title: 'Foundations of Leadership', description: 'Leadership styles, Glee Club history and values' },
      { week: 2, title: 'Roles & Responsibilities', description: 'Executive board positions, handbook review' },
      { week: 3, title: 'Communication', description: 'Effective communication, conflict resolution' },
      { week: 4, title: 'Team Building', description: 'Section leadership, building cohesion' },
      { week: 5, title: 'Event Planning I', description: 'Logistics, budgeting, timelines' },
      { week: 6, title: 'Event Planning II', description: 'Execution, troubleshooting, follow-up' },
      { week: 7, title: 'Documentation & Records', description: 'Institutional memory, GleeWorld admin tools' },
      { week: 8, title: 'Mid-Semester Review', description: 'Progress check, feedback sessions' },
      { week: 9, title: 'Mentorship Skills', description: 'Coaching, supporting new members' },
      { week: 10, title: 'Crisis Management', description: 'Problem-solving, emergency protocols' },
      { week: 11, title: 'Tour & Travel Leadership', description: 'Managing the ensemble on the road' },
      { week: 12, title: 'Financial Stewardship', description: 'Budgets, fundraising, accountability' },
      { week: 13, title: 'Proposal Presentations', description: 'Present process improvement ideas', assignments: 'Proposal Due' },
      { week: 14, title: 'Legacy Planning', description: 'Transition, training successors' },
      { week: 15, title: 'Reflection & Celebration', description: 'Semester review, recognition ceremony' },
      { week: 16, title: 'Final Portfolios', description: 'Submit leadership portfolios', assignments: 'Portfolio Due' },
    ],
  },

  'LH 100': {
    courseCode: 'LH 100',
    courseTitle: 'Bowman Scholars',
    term: 'Fall 2025',
    credits: 1,
    classTime: 'Wednesdays 6:00–8:00 PM',
    classroom: 'Sisters Chapel / Virtual',
    instructor: {
      name: 'Dr. Kevin Johnson',
      email: 'kjohns10@riversidechoir.example',
      office: 'Rock Fine Arts Bldg. 109',
      officeHours: 'By appointment',
    },
    description: 'Named after Sister Thea Bowman, this program develops liturgical leaders through spiritual formation, music ministry, and worship planning. Scholars serve as cantors, choir directors, and worship leaders in campus and community settings, honoring the legacy of Black Catholic worship traditions.',
    objectives: [
      'Develop skills in liturgical music leadership and cantoring',
      'Understand the structure and theology of worship across traditions',
      'Plan and lead worship services integrating music and liturgy',
      'Study the life and legacy of Sister Thea Bowman',
      'Engage in spiritual formation and personal faith development',
      'Serve the campus and broader community through music ministry',
    ],
    materials: [
      'Lead Me, Guide Me Hymnal',
      'Selected readings on Sister Thea Bowman',
      'Liturgical planning resources (provided)',
    ],
    assignments: [
      { name: 'Worship Leadership Practicum', points: '35%', description: 'Lead or co-lead worship services throughout the semester' },
      { name: 'Spiritual Formation Journals', points: '25%', description: 'Weekly reflections on spiritual growth and ministry' },
      { name: 'Liturgical Planning Project', points: '20%', description: 'Design a complete worship service with music, readings, and flow' },
      { name: 'Sister Thea Bowman Research', points: '10%', description: 'Presentation on aspect of Sister Thea\'s life and legacy' },
      { name: 'Community Service', points: '10%', description: 'Music ministry in campus or community setting' },
    ],
    grading: [
      { name: 'Worship Leadership Practicum', weight: '35%' },
      { name: 'Spiritual Formation Journals', weight: '25%' },
      { name: 'Liturgical Planning Project', weight: '20%' },
      { name: 'Sister Thea Research', weight: '10%' },
      { name: 'Community Service', weight: '10%' },
    ],
    gradingScale: [
      { grade: 'A', range: '93–100%' },
      { grade: 'A-', range: '90–92%' },
      { grade: 'B+', range: '87–89%' },
      { grade: 'B', range: '83–86%' },
      { grade: 'B-', range: '80–82%' },
      { grade: 'C', range: '70–79%' },
      { grade: 'F', range: 'Below 70%' },
    ],
    attendancePolicy: 'Regular attendance is essential for spiritual formation and community building. Absences must be communicated in advance.',
    academicIntegrity: 'All written reflections must be genuine expressions of personal spiritual journey.',
    accessStatement: 'Riverside Music Institute is committed to ensuring the full participation of all students. Contact the Student Access Center (SAC) at 404-270-5289 for accommodations.',
    schedule: [
      { week: 1, title: 'Introduction', description: 'Program overview, spiritual formation goals' },
      { week: 2, title: 'Sister Thea Bowman', description: 'Life, legacy, and vision for Black Catholic worship' },
      { week: 3, title: 'Liturgical Foundations', description: 'Structure of worship, the liturgical year' },
      { week: 4, title: 'Music in Worship', description: 'Selecting appropriate music, leading congregational song' },
      { week: 5, title: 'Cantoring Skills', description: 'Vocal technique, microphone presence, leading responsorials' },
      { week: 6, title: 'Choir Direction Basics', description: 'Leading volunteer choirs, rehearsal techniques' },
      { week: 7, title: 'African American Worship Traditions', description: 'Call-and-response, shouting traditions, gospel styles' },
      { week: 8, title: 'Ecumenical Perspectives', description: 'Worship across denominations, interfaith sensitivity' },
      { week: 9, title: 'Liturgical Planning I', description: 'Service design, flow, and transitions' },
      { week: 10, title: 'Liturgical Planning II', description: 'Integrating music, readings, and prayer' },
      { week: 11, title: 'Practicum Preparation', description: 'Prepare for worship leadership assignments' },
      { week: 12, title: 'Community Outreach', description: 'Ministry beyond campus, service opportunities' },
      { week: 13, title: 'Presentations', description: 'Sister Thea research presentations', assignments: 'Presentations' },
      { week: 14, title: 'Final Worship Service', description: 'Scholar-led worship celebration' },
      { week: 15, title: 'Reflection & Commissioning', description: 'Semester reflection, commissioning ceremony' },
      { week: 16, title: 'Finals', description: 'Final journals and portfolios due', assignments: 'Final Submissions' },
    ],
  },

  'MUS 001': {
    courseCode: 'MUS 001',
    courseTitle: 'Private Applied Lessons',
    term: 'Fall 2025',
    credits: 1,
    classTime: 'By appointment (weekly 50-minute lessons)',
    classroom: 'Rock Fine Arts Practice Rooms',
    instructor: {
      name: 'Dr. Kevin Johnson',
      email: 'kjohns10@riversidechoir.example',
      office: 'Rock Fine Arts Bldg. 109',
      officeHours: 'By appointment',
    },
    description: 'One-on-one instruction in voice or instrument with personalized curriculum tailored to the student\'s skill level and musical goals. Students develop technique, artistry, and performance skills through weekly lessons and regular practice.',
    objectives: [
      'Develop technical proficiency on chosen voice/instrument',
      'Build a diverse performance repertoire',
      'Strengthen sight-reading and musicianship skills',
      'Prepare for jury examinations and recital performances',
      'Cultivate professional practice habits',
      'Explore stylistic diversity across musical periods',
    ],
    materials: [
      'Repertoire as assigned by instructor',
      'Method books (as specified)',
      'Recording device for practice feedback',
    ],
    assignments: [
      { name: 'Weekly Lessons & Preparation', points: '40%', description: 'Consistent attendance and demonstrated preparation' },
      { name: 'Practice Documentation', points: '20%', description: 'Weekly practice log (minimum 5 hours/week)' },
      { name: 'Performance Class', points: '15%', description: 'Participation in studio class performances' },
      { name: 'Mid-Semester Jury', points: '10%', description: 'Faculty evaluation of progress' },
      { name: 'Final Jury/Recital', points: '15%', description: 'End-of-semester performance examination' },
    ],
    grading: [
      { name: 'Weekly Lessons', weight: '40%' },
      { name: 'Practice Documentation', weight: '20%' },
      { name: 'Performance Class', weight: '15%' },
      { name: 'Mid-Semester Jury', weight: '10%' },
      { name: 'Final Jury', weight: '15%' },
    ],
    gradingScale: [
      { grade: 'A', range: '93–100%' },
      { grade: 'A-', range: '90–92%' },
      { grade: 'B+', range: '87–89%' },
      { grade: 'B', range: '83–86%' },
      { grade: 'B-', range: '80–82%' },
      { grade: 'C+', range: '77–79%' },
      { grade: 'C', range: '73–76%' },
      { grade: 'D', range: '60–69%' },
      { grade: 'F', range: 'Below 60%' },
    ],
    attendancePolicy: 'Attendance at all scheduled lessons is mandatory. Missed lessons must be rescheduled within the same week when possible. More than two missed lessons may result in grade reduction.',
    academicIntegrity: 'All performances and practice documentation must reflect the student\'s own work and effort.',
    accessStatement: 'Riverside Music Institute is committed to ensuring the full participation of all students. Contact the Student Access Center (SAC) at 404-270-5289 for accommodations.',
    schedule: [
      { week: 1, title: 'Assessment & Goal Setting', description: 'Initial evaluation, establish semester goals' },
      { week: 2, title: 'Technical Foundations', description: 'Warm-ups, exercises, fundamental technique' },
      { week: 3, title: 'Repertoire Introduction', description: 'Begin first assigned pieces' },
      { week: 4, title: 'Continued Development', description: 'Technique refinement, repertoire work' },
      { week: 5, title: 'Performance Class 1', description: 'First informal performance opportunity' },
      { week: 6, title: 'Mid-Semester Preparation', description: 'Prepare jury repertoire' },
      { week: 7, title: 'Mid-Semester Jury', description: 'Faculty jury evaluation', assignments: 'Mid-Semester Jury' },
      { week: 8, title: 'New Repertoire', description: 'Introduce second half repertoire' },
      { week: 9, title: 'Stylistic Exploration', description: 'Focus on interpretation and style' },
      { week: 10, title: 'Performance Class 2', description: 'Second performance opportunity' },
      { week: 11, title: 'Advanced Technique', description: 'Address specific technical challenges' },
      { week: 12, title: 'Final Preparation I', description: 'Polish jury repertoire' },
      { week: 13, title: 'Final Preparation II', description: 'Run-through and feedback' },
      { week: 14, title: 'Pre-Jury Coaching', description: 'Final coaching session' },
      { week: 15, title: 'Final Jury Week', description: 'End-of-semester performance examination', assignments: 'Final Jury' },
      { week: 16, title: 'Semester Reflection', description: 'Review progress, plan for next semester' },
    ],
  },
};

export const getSyllabus = (courseCode: string): CourseSyllabus | undefined => {
  return SYLLABUS_DATA[courseCode];
};

export const getAllSyllabi = (): CourseSyllabus[] => {
  return Object.values(SYLLABUS_DATA);
};
