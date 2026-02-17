/**
 * Course-specific grading configuration
 * Maps course IDs to their syllabus grading breakdowns
 * This ensures the student grading view shows the correct components per course
 */

export interface GradingComponent {
  component: string;
  weight: number;
  description?: string;
}

export interface CourseGradingConfig {
  courseId: string;
  courseCode: string;
  components: GradingComponent[];
  usesDeductiveModel: boolean;
  attendanceDeductionPerAbsence?: number;
  /** MUS 070 attendance-only grading model */
  attendanceOnlyModel?: {
    allowedAbsences: number;       // Free passes before grade drops
    absencesPerLetterDrop: number;  // Each N additional absences = 1 letter grade drop
  };
}

/**
 * Grading configurations for all academy courses
 * Based on official syllabi from academySyllabusDefaults.ts
 */
export const COURSE_GRADING_CONFIGS: Record<string, CourseGradingConfig> = {
  // MUS 070 - Glee Club
  // MUS 070 - Glee Club (per official syllabus)
  'a0000000-0000-0000-0000-000000000070': {
    courseId: 'a0000000-0000-0000-0000-000000000070',
    courseCode: 'MUS 070',
    components: [
      { component: 'Attendance', weight: 100, description: 'Required attendance at all scheduled rehearsals and performances. 2 unexcused absences allowed; 3rd absence drops grade from A to B.' },
    ],
    usesDeductiveModel: true,
    attendanceOnlyModel: {
      allowedAbsences: 2,
      absencesPerLetterDrop: 1,
    },
  },

  // MUS 210 - Choral Conducting and Literature
  '2026c613-bda7-487a-a5d9-91e57c26a741': {
    courseId: '2026c613-bda7-487a-a5d9-91e57c26a741',
    courseCode: 'MUS 210',
    components: [
      { component: 'Technique Juries (2)', weight: 20, description: 'Two technique juries demonstrating conducting skills' },
      { component: 'Non-Touring Choir Practicum', weight: 30, description: 'Leading rehearsals with the non-touring choir' },
      { component: 'Weekly Videos & Score Uploads', weight: 20, description: 'Conducting videos and marked scores on GleeWorld' },
      { component: 'Final 30-Minute Jury', weight: 30, description: 'Conducting a major choral work from memory' }
    ],
    usesDeductiveModel: true,
    attendanceDeductionPerAbsence: 2
  },

  // MUS 240 - Survey of African American Music
  '23c4ee3c-7bbb-4534-8c0a-eecd88298d37': {
    courseId: '23c4ee3c-7bbb-4534-8c0a-eecd88298d37',
    courseCode: 'MUS 240',
    components: [
      { component: 'Listening Journals', weight: 30, description: '10 × 20 pts = 200 pts: Weekly 250–300 word essays connecting listening examples to cultural context' },
      { component: 'Research Project', weight: 23, description: '150 pts: Includes proposal, annotated bibliography, and final online presentation' },
      { component: 'AI Group Project', weight: 15, description: '100 pts: Six collaborative teams explore AI\'s role in African American music' },
      { component: 'Midterm Exam', weight: 15, description: '100 pts: Listening identification + essays on style and context' },
      { component: 'Final Reflection Essay', weight: 8, description: '50 pts: 4–5 page synthesis essay connecting course themes and personal insights' },
      { component: 'Participation/Discussion/Attendance', weight: 8, description: '50 pts: Consistent preparation and engagement in class' }
    ],
    usesDeductiveModel: true,
    attendanceDeductionPerAbsence: 2
  },

  // MUS 101 - Music Fundamentals Theory
  'a0000000-0000-0000-0000-000000000101': {
    courseId: 'a0000000-0000-0000-0000-000000000101',
    courseCode: 'MUS 101',
    components: [
      { component: 'Weekly Assignments', weight: 30 },
      { component: 'Quizzes', weight: 20 },
      { component: 'Midterm Exam', weight: 20 },
      { component: 'Final Exam', weight: 25 },
      { component: 'Class Participation', weight: 5 }
    ],
    usesDeductiveModel: true,
    attendanceDeductionPerAbsence: 2
  },

  // MUS 001 - Private Applied Lessons
  'a0000000-0000-0000-0000-000000000001': {
    courseId: 'a0000000-0000-0000-0000-000000000001',
    courseCode: 'MUS 001',
    components: [
      { component: 'Lesson Attendance & Preparation', weight: 40 },
      { component: 'Practice Hours (logged)', weight: 20 },
      { component: 'Jury Performance', weight: 30 },
      { component: 'Studio Class Participation', weight: 10 }
    ],
    usesDeductiveModel: true,
    attendanceDeductionPerAbsence: 2
  },

  // GLEE 000 - Sight Singing Institute
  'a0000000-0000-0000-0000-000000000000': {
    courseId: 'a0000000-0000-0000-0000-000000000000',
    courseCode: 'GLEE 000',
    components: [
      { component: 'Weekly Sight-Singing Tests', weight: 40 },
      { component: 'Ear Training Assignments', weight: 25 },
      { component: 'Final Practical Exam', weight: 25 },
      { component: 'Class Participation', weight: 10 }
    ],
    usesDeductiveModel: true,
    attendanceDeductionPerAbsence: 2
  },

  // GLEE 101 - Leadership Development
  'a0000000-0000-0000-0000-0000000e0101': {
    courseId: 'a0000000-0000-0000-0000-0000000e0101',
    courseCode: 'GLEE 101',
    components: [
      { component: 'Leadership Project', weight: 35 },
      { component: 'Team Presentations', weight: 25 },
      { component: 'Reflection Journals', weight: 20 },
      { component: 'Participation & Attendance', weight: 20 }
    ],
    usesDeductiveModel: true,
    attendanceDeductionPerAbsence: 2
  }
};

/**
 * Get grading config for a specific course
 * Returns a default config if the course isn't found
 */
export const getCourseGradingConfig = (courseId: string): CourseGradingConfig => {
  const config = COURSE_GRADING_CONFIGS[courseId];
  
  if (config) {
    return config;
  }

  // Default fallback config
  return {
    courseId,
    courseCode: 'Unknown',
    components: [
      { component: 'Assignments', weight: 40 },
      { component: 'Attendance & Participation', weight: 30 },
      { component: 'Exams', weight: 30 }
    ],
    usesDeductiveModel: true,
    attendanceDeductionPerAbsence: 2
  };
};

/**
 * Get just the grading breakdown components for a course
 */
export const getGradingBreakdown = (courseId: string): GradingComponent[] => {
  return getCourseGradingConfig(courseId).components;
};
