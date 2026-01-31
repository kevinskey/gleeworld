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
  usesDeductiveModel: boolean; // If true, starts at 100% and deducts
  attendanceDeductionPerAbsence?: number; // Points deducted per unexcused absence
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
      { component: 'Attendance', weight: 45, description: 'Required attendance at all scheduled rehearsals' },
      { component: 'Spring Concert', weight: 10, description: 'Flagship Spring 2026 performance' },
      { component: 'Graduation/Commencement', weight: 5, description: 'Commencement ceremony performance' },
      { component: 'Founders Day', weight: 4, description: 'Spelman Founders Day celebration' },
      { component: 'TBD Performance 1', weight: 5.5, description: 'Community outreach, AUC collaboration, or festival' },
      { component: 'TBD Performance 2', weight: 5.5, description: 'Community outreach, AUC collaboration, or festival' },
      { component: 'Sight Singing – Music Reading', weight: 15, description: '2 weekly sight singing quizzes + 30 min/week on SightReadingFactory.com' },
      { component: 'Sectionals', weight: 10, description: 'Attendance and participation in section rehearsals led by section leaders' }
    ],
    usesDeductiveModel: true,
    attendanceDeductionPerAbsence: 2
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
      { component: 'Listening Journals', weight: 25, description: 'Weekly journal entries analyzing assigned music' },
      { component: 'Research Paper', weight: 25, description: 'Major research paper on a course topic' },
      { component: 'Midterm Exam', weight: 20, description: 'Midterm examination' },
      { component: 'Final Exam', weight: 20, description: 'Comprehensive final examination' },
      { component: 'Class Participation', weight: 10, description: 'Polls, discussions, and attendance' }
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
