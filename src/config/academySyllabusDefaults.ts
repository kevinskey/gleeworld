// Default syllabus content for all academy courses
// This provides fallback content when no DB record exists
// Admins can override this by publishing a syllabus in the database

import { UnifiedSyllabusData, SyllabusPhase, GradingItem } from '@/components/academy/syllabus/UnifiedSyllabusRenderer';

type SyllabusDefaults = Omit<UnifiedSyllabusData, 'id'>;

const STANDARD_POLICIES = {
  academic_honesty_policy: `At the heart of Riverside Music Institute's mission is academic excellence, along with the development of intellectual, ethical and leadership qualities. All members of the academic community are expected to follow the basic standards of honesty and integrity as outlined in the Riverside Music Institute Code of Conduct.`,
  disability_statement: `Riverside Music Institute is committed to ensuring the full participation of all students in its programs. If you have a documented disability, contact the Student Access Center (SAC) at 404-270-5289. Located in MacVicar Hall, Room 106.`,
  additional_policies: null
};

export const SYLLABUS_DEFAULTS: Record<string, SyllabusDefaults> = {
  'MUS 070': {
    name: 'Glee Club',
    term: 'Spring 2026',
    credits: 1,
    class_time: 'M/W/F 5:00 PM - 6:15 PM',
    classroom: 'Sisters Chapel',
    instructor_name: 'Dr. Kevin Johnson',
    instructor_email: 'kjohns10@riversidechoir.example',
    instructor_office: 'Fine Arts 105',
    office_hours: 'MWF 3-5 PM',
    purpose: 'The Your favorite band or choir is the premier choral ensemble of Riverside Music Institute with over 100 years of musical excellence. Members develop vocal technique, musicianship, and performance skills while representing the college at concerts, tours, and special events.',
    course_model: null,
    course_badge: 'Choral Ensemble',
    course_phases: null,
    grading_breakdown: [
      { component: 'Attendance', weight: 100 },
    ],
    grading_scale: { 'A': '90-100', 'B': '80-89', 'C': '70-79', 'D': '60-69', 'F': 'Below 60' },
    weekly_schedule: null,
    attendance_policy: 'Grades are based entirely on attendance. Each member is allowed 2 unexcused absences per semester. The 3rd unexcused absence changes the grade from A to B. Each additional unexcused absence drops the grade by one full letter (B→C→D→F). Three tardies equal one absence.',
    late_assignment_policy: null,
    ...STANDARD_POLICIES
  },

  'MUS 210': {
    name: 'Choral Conducting and Literature',
    term: 'Spring 2026',
    credits: 3,
    class_time: 'M/W • 75 minutes',
    classroom: 'Fine Arts 109',
    instructor_name: 'Dr. Kevin Johnson',
    instructor_email: 'kjohns10@riversidechoir.example',
    instructor_office: 'Fine Arts 105',
    office_hours: 'MWF 3–5 PM or appointment',
    purpose: null,
    course_model: `This is not a lecture course.\nThis is a conducting studio.\n\nEvery class:\n• 10 min warm-ups (student led)\n• 3 × 18 min podium blocks\n• 10 min score & video review\n\nEach student conducts every class.`,
    course_badge: 'Conducting Studio',
    course_phases: [
      {
        phase: 'I',
        title: 'Body → Time → Authority',
        dates: 'Jan 14 – Feb 4',
        goal: 'Build physical grammar of conducting before interpretation.',
        topics: ['Baton grip & posture', 'Ictus & rebound', '2-3-4 patterns', 'Subdivision', 'Preparatory beats', 'Releases'],
        assessments: ['Weekly conducting videos (GleeWorld)', 'Mirror drills', 'Technique Jury #1 (Feb 4)']
      },
      {
        phase: 'II',
        title: 'Score = Map',
        dates: 'Feb 9 – Feb 18',
        goal: 'Conductors learn to think before moving.',
        topics: ['Reading SSAA scores', 'Vocal ranges', 'Choir layout', 'Score marking system', 'Form & phrase structure', 'Cue mapping'],
        assessments: ['Choose final major work', 'Begin score memory', 'Upload marked score to GleeWorld']
      },
      {
        phase: 'III',
        title: 'Non-Touring Choir Practicum',
        dates: 'Feb 23 – Mar 6 (6 rehearsals)',
        goal: 'You are not in the room. They run the choir.',
        topics: ['Morley – Sing We and Chant It (SSAA)', 'Wade in the Water (SSAA)', 'Ubi Caritas (SSAA)', 'Dona Nobis Pacem (round)'],
        assessments: ['Rehearsal plan', 'Marked score', 'Video', 'Post-rehearsal report']
      },
      {
        phase: 'IV',
        title: 'Advanced Control',
        dates: 'Mar 16 – Apr 1',
        goal: 'Move from beating time to shaping music.',
        topics: ['Rubato', 'Fermata types', 'Melding', 'Mixed meter', 'Conducting in 1/2/3/4', 'Phrase direction'],
        assessments: ['Technique Jury #2']
      },
      {
        phase: 'V',
        title: 'The Memory Arc',
        dates: 'Apr 6 – Apr 22',
        goal: 'Own the score completely.',
        topics: ['Memorization drills', 'Cue accuracy', 'Structural awareness', 'Full run-throughs'],
        assessments: ['Conduct entire major work from memory with clear cueing and phrasing']
      },
      {
        phase: 'VI',
        title: 'Final Jury',
        dates: 'Wed, Apr 29',
        goal: 'Each student conducts 30 minutes of a major choral work from memory.',
        topics: ['Baton technique', 'Time clarity', 'Expressive gesture', 'Score mastery', 'Leadership'],
        assessments: []
      }
    ],
    grading_breakdown: [
      { component: 'Technique juries (2)', weight: 20 },
      { component: 'Non-touring choir practicum', weight: 30 },
      { component: 'Weekly videos & score uploads', weight: 20 },
      { component: 'Final 30-minute jury', weight: 30 }
    ],
    grading_scale: null,
    weekly_schedule: null,
    attendance_policy: null,
    late_assignment_policy: null,
    ...STANDARD_POLICIES
  },

  'MUS 240': {
    name: 'Survey of African American Music',
    term: 'Spring 2026',
    credits: 3,
    class_time: 'M/W/F 1:00 PM - 1:50 PM',
    classroom: 'Fine Arts 201',
    instructor_name: 'Dr. Kevin Johnson',
    instructor_email: 'kjohns10@riversidechoir.example',
    instructor_office: 'Fine Arts 105',
    office_hours: 'MWF 3-5 PM',
    purpose: 'This course explores the rich tapestry of African American musical traditions, from spirituals and blues to jazz, gospel, R&B, and hip-hop. Students will develop critical listening skills, understand historical context, and analyze the cultural significance of Black music in American society.',
    course_model: null,
    course_badge: 'Music History',
    course_phases: null,
    grading_breakdown: [
      { component: 'Listening Journals', weight: 25 },
      { component: 'Research Paper', weight: 25 },
      { component: 'Midterm Exam', weight: 20 },
      { component: 'Final Exam', weight: 20 },
      { component: 'Class Participation', weight: 10 }
    ],
    grading_scale: { 'A': '90-100', 'B': '80-89', 'C': '70-79', 'D': '60-69', 'F': 'Below 60' },
    weekly_schedule: [
      { week: 'Week 1', topics: 'Introduction: African Musical Roots' },
      { week: 'Week 2', topics: 'The Spirituals: Songs of Survival' },
      { week: 'Week 3', topics: 'Work Songs and Field Hollers' },
      { week: 'Week 4', topics: 'The Blues: Origin and Evolution' },
      { week: 'Week 5', topics: 'Classic Blues and Women Performers' },
      { week: 'Week 6', topics: 'Early Jazz: New Orleans Origins' },
      { week: 'Week 7', topics: 'The Harlem Renaissance and Jazz' },
      { week: 'Week 8', topics: 'Midterm Exam' },
      { week: 'Week 9', topics: 'Gospel Music: Sacred Traditions' },
      { week: 'Week 10', topics: 'Bebop and Modern Jazz' },
      { week: 'Week 11', topics: 'Rhythm & Blues and Soul' },
      { week: 'Week 12', topics: 'Motown and the Sound of Young America' },
      { week: 'Week 13', topics: 'Funk, Disco, and Electronic Music' },
      { week: 'Week 14', topics: 'Hip-Hop: Roots and Revolution' },
      { week: 'Week 15', topics: 'Contemporary Black Music and Legacy' },
      { week: 'Week 16', topics: 'Final Exam' }
    ],
    attendance_policy: 'Students are expected to attend all class sessions. More than 3 unexcused absences will result in a grade reduction.',
    late_assignment_policy: 'Late assignments will be penalized 10% per day. No assignments accepted after 5 days.',
    ...STANDARD_POLICIES
  },

  'MUS 101': {
    name: 'Music Fundamentals Theory',
    term: 'Spring 2026',
    credits: 3,
    class_time: 'M/W/F 10:00 AM - 10:50 AM',
    classroom: 'Fine Arts 110',
    instructor_name: 'Dr. Kevin Johnson',
    instructor_email: 'kjohns10@riversidechoir.example',
    instructor_office: 'Fine Arts 105',
    office_hours: 'MWF 3-5 PM',
    purpose: 'This course builds a strong foundation in music theory including notation, rhythm, scales, intervals, chords, and basic harmony. Students will develop skills in reading, writing, and analyzing music.',
    course_model: null,
    course_badge: 'Music Theory',
    course_phases: null,
    grading_breakdown: [
      { component: 'Weekly Assignments', weight: 30 },
      { component: 'Quizzes', weight: 20 },
      { component: 'Midterm Exam', weight: 20 },
      { component: 'Final Exam', weight: 25 },
      { component: 'Class Participation', weight: 5 }
    ],
    grading_scale: { 'A': '90-100', 'B': '80-89', 'C': '70-79', 'D': '60-69', 'F': 'Below 60' },
    weekly_schedule: [
      { week: 'Week 1', topics: 'Music Notation: Staff, Clefs, and Notes' },
      { week: 'Week 2', topics: 'Rhythm: Note Values and Time Signatures' },
      { week: 'Week 3', topics: 'Major Scales and Key Signatures' },
      { week: 'Week 4', topics: 'Minor Scales: Natural, Harmonic, Melodic' },
      { week: 'Week 5', topics: 'Intervals: Identification and Construction' },
      { week: 'Week 6', topics: 'Triads: Major, Minor, Diminished, Augmented' },
      { week: 'Week 7', topics: 'Review and Midterm Preparation' },
      { week: 'Week 8', topics: 'Midterm Exam' },
      { week: 'Week 9', topics: 'Seventh Chords' },
      { week: 'Week 10', topics: 'Chord Progressions and Roman Numerals' },
      { week: 'Week 11', topics: 'Cadences and Phrase Structure' },
      { week: 'Week 12', topics: 'Non-Chord Tones' },
      { week: 'Week 13', topics: 'Basic Voice Leading' },
      { week: 'Week 14', topics: 'Form and Analysis' },
      { week: 'Week 15', topics: 'Review for Final Exam' },
      { week: 'Week 16', topics: 'Final Exam' }
    ],
    attendance_policy: 'Regular attendance is essential for success in this course. More than 3 unexcused absences will affect your participation grade.',
    late_assignment_policy: 'Late work is accepted with a 15% penalty per day, up to 3 days.',
    ...STANDARD_POLICIES
  },

  'MUS 001': {
    name: 'Private Applied Lessons',
    term: 'Spring 2026',
    credits: 1,
    class_time: 'By Appointment',
    classroom: 'Fine Arts Practice Rooms',
    instructor_name: 'Dr. Kevin Johnson',
    instructor_email: 'kjohns10@riversidechoir.example',
    instructor_office: 'Fine Arts 105',
    office_hours: 'By Appointment',
    purpose: 'One-on-one instruction in voice or instrument with personalized curriculum tailored to your skill level and musical goals. Students will develop technique, musicality, and performance skills.',
    course_model: `Weekly 30-minute or 60-minute private lessons.\n\nEach lesson:\n• Warm-up and technique exercises\n• Repertoire work\n• Sight-reading practice\n• Performance preparation`,
    course_badge: 'Applied Lessons',
    course_phases: null,
    grading_breakdown: [
      { component: 'Lesson Attendance & Preparation', weight: 40 },
      { component: 'Practice Hours (logged)', weight: 20 },
      { component: 'Jury Performance', weight: 30 },
      { component: 'Studio Class Participation', weight: 10 }
    ],
    grading_scale: { 'A': '90-100', 'B': '80-89', 'C': '70-79', 'D': '60-69', 'F': 'Below 60' },
    weekly_schedule: null,
    attendance_policy: 'All scheduled lessons are mandatory. Cancellations must be made 24 hours in advance. Missed lessons without notice cannot be rescheduled.',
    late_assignment_policy: null,
    ...STANDARD_POLICIES
  },

  'MUS 000': {
    name: 'Sight Singing Institute',
    term: 'Spring 2026',
    credits: 1,
    class_time: 'T/Th 4:00 PM - 5:15 PM',
    classroom: 'Fine Arts 109',
    instructor_name: 'Dr. Kevin Johnson',
    instructor_email: 'kjohns10@riversidechoir.example',
    instructor_office: 'Fine Arts 105',
    office_hours: 'MWF 3-5 PM',
    purpose: 'Intensive training in sight-reading and ear training to develop musicianship skills essential for all musicians. Students will learn solfège, rhythmic reading, and aural skills.',
    course_model: null,
    course_badge: 'Sight Singing',
    course_phases: null,
    grading_breakdown: [
      { component: 'Weekly Sight-Singing Tests', weight: 40 },
      { component: 'Ear Training Assignments', weight: 25 },
      { component: 'Final Practical Exam', weight: 25 },
      { component: 'Class Participation', weight: 10 }
    ],
    grading_scale: { 'A': '90-100', 'B': '80-89', 'C': '70-79', 'D': '60-69', 'F': 'Below 60' },
    weekly_schedule: [
      { week: 'Week 1', topics: 'Introduction to Solfège: Do-Re-Mi' },
      { week: 'Week 2', topics: 'Major Scale Patterns' },
      { week: 'Week 3', topics: 'Intervals: 2nds and 3rds' },
      { week: 'Week 4', topics: 'Intervals: 4ths and 5ths' },
      { week: 'Week 5', topics: 'Minor Mode Introduction' },
      { week: 'Week 6', topics: 'Rhythm: Simple Meter' },
      { week: 'Week 7', topics: 'Rhythm: Compound Meter' },
      { week: 'Week 8', topics: 'Final Practical Exam' }
    ],
    attendance_policy: 'Attendance at all sessions is required. This is a skill-building course where consistent practice is essential.',
    late_assignment_policy: 'Make-up tests must be scheduled within one week of absence.',
    ...STANDARD_POLICIES
  },

  'GLEE 101': {
    name: 'Leadership Development',
    term: 'Spring 2026',
    credits: 1,
    class_time: 'By Appointment',
    classroom: 'Fine Arts 105',
    instructor_name: 'Dr. Kevin Johnson',
    instructor_email: 'kjohns10@riversidechoir.example',
    instructor_office: 'Fine Arts 105',
    office_hours: 'MWF 3-5 PM',
    purpose: 'Develop leadership skills essential for executive board members and future leaders in the Glee Club organization. Topics include team management, event planning, communication, and organizational leadership.',
    course_model: null,
    course_badge: 'Leadership',
    course_phases: null,
    grading_breakdown: [
      { component: 'Leadership Project', weight: 35 },
      { component: 'Team Presentations', weight: 25 },
      { component: 'Reflection Journals', weight: 20 },
      { component: 'Participation & Attendance', weight: 20 }
    ],
    grading_scale: { 'A': '90-100', 'B': '80-89', 'C': '70-79', 'D': '60-69', 'F': 'Below 60' },
    weekly_schedule: [
      { week: 'Week 1', topics: 'Introduction: Leadership in Music Organizations' },
      { week: 'Week 2', topics: 'Communication Skills for Leaders' },
      { week: 'Week 3', topics: 'Team Building and Collaboration' },
      { week: 'Week 4', topics: 'Conflict Resolution' },
      { week: 'Week 5', topics: 'Event Planning Fundamentals' },
      { week: 'Week 6', topics: 'Budget Management' },
      { week: 'Week 7', topics: 'Public Speaking and Representation' },
      { week: 'Week 8', topics: 'Time Management and Delegation' },
      { week: 'Week 9', topics: 'Mentorship and Succession Planning' },
      { week: 'Week 10', topics: 'Crisis Management' },
      { week: 'Week 11', topics: 'Digital Leadership and Social Media' },
      { week: 'Week 12', topics: 'Building Organizational Culture' },
      { week: 'Week 13', topics: 'Leadership Project Presentations' },
      { week: 'Week 14', topics: 'Leadership Project Presentations' },
      { week: 'Week 15', topics: 'Reflection and Goal Setting' },
      { week: 'Week 16', topics: 'Course Wrap-up and Celebration' }
    ],
    attendance_policy: 'Active participation is essential. More than 2 absences will affect your grade.',
    late_assignment_policy: 'Late submissions accepted with 10% penalty per day.',
    ...STANDARD_POLICIES
  }
};

/**
 * Get default syllabus content for a course code
 * Falls back to generic content if no specific default exists
 */
export const getDefaultSyllabus = (courseCode: string): SyllabusDefaults | null => {
  // Normalize course code (handle MUS 210-A, MUS 210-B, etc.)
  const normalizedCode = courseCode.trim().toUpperCase().split('-')[0].trim();
  return SYLLABUS_DEFAULTS[normalizedCode] || null;
};
