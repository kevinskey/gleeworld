/**
 * Course Template v1 Configuration
 * 
 * This file defines the canonical student interface template for all GleeWorld courses.
 * Layout, typography, and hierarchy are LOCKED and must remain identical across all courses.
 * 
 * Courses may differ ONLY by:
 * - enabled/disabled modules
 * - module order
 * - course-specific extension modules
 */

import { LucideIcon, Home, FileText, Layers, ClipboardList, MessageSquare, PenLine, BarChart, FileCheck, Trophy, Users, Video, Headphones, Music, Library, Settings, ArrowLeft, Vote, Images, Calendar, BookOpen, Archive } from 'lucide-react';

export interface CourseNavItem {
  icon: LucideIcon;
  label: string;
  tab: string;
  isExtension?: boolean; // Course-specific extension module
}

export interface CourseTemplateConfig {
  courseId: string;
  courseCode: string;
  
  // Primary Navigation - Core modules available to all courses
  primaryNav: CourseNavItem[];
  
  // Course Core Section - Media and resource modules
  courseCore: CourseNavItem[];
  
  // Extension Modules - Course-specific additional features
  extensions?: CourseNavItem[];
  
  // Feature flags
  features: {
    hasJournals: boolean;
    hasPolls: boolean;
    hasTests: boolean;
    hasDiscussions: boolean;
    hasPeerReview: boolean;
    hasGroups: boolean;
    hasListeningHub: boolean;
    hasPlanner: boolean;       // LH 100 specific
    hasPhotoGallery: boolean;  // LH 100 specific
    hasElections: boolean;
    hasHandbook: boolean;
  };
}

// Default primary navigation for all courses
const DEFAULT_PRIMARY_NAV: CourseNavItem[] = [
  { icon: Home, label: 'Home', tab: 'home' },
  { icon: FileText, label: 'Syllabus', tab: 'syllabus' },
  { icon: Layers, label: 'Modules', tab: 'modules' },
  { icon: ClipboardList, label: 'Assignments', tab: 'assignments' },
  { icon: MessageSquare, label: 'Discussions', tab: 'discussions' },
  { icon: PenLine, label: 'Journals', tab: 'journals' },
  { icon: BarChart, label: 'Polls', tab: 'polls' },
  { icon: FileCheck, label: 'Tests', tab: 'tests' },
  { icon: Trophy, label: 'Grades', tab: 'grades' },
];

// Default course core navigation for all courses
const DEFAULT_COURSE_CORE: CourseNavItem[] = [
  { icon: Users, label: 'Engagement', tab: 'engagement' },
  { icon: Video, label: 'Video', tab: 'video-library' },
  { icon: Headphones, label: 'Audio', tab: 'playlist' },
  { icon: Music, label: 'Sheet Music', tab: 'music-library' },
  { icon: Library, label: 'Resources', tab: 'resources' },
];

// Default feature flags
const DEFAULT_FEATURES: CourseTemplateConfig['features'] = {
  hasJournals: true,
  hasPolls: true,
  hasTests: true,
  hasDiscussions: true,
  hasPeerReview: false,
  hasGroups: false,
  hasListeningHub: false,
  hasPlanner: false,
  hasPhotoGallery: false,
  hasElections: false,
  hasHandbook: false,
};

// Course-specific configurations
export const COURSE_TEMPLATE_CONFIGS: Record<string, CourseTemplateConfig> = {
  // MUS 070 - Glee Club
  'a0000000-0000-0000-0000-000000000070': {
    courseId: 'a0000000-0000-0000-0000-000000000070',
    courseCode: 'MUS 070',
    primaryNav: DEFAULT_PRIMARY_NAV,
    courseCore: DEFAULT_COURSE_CORE,
    extensions: [
      { icon: Vote, label: 'Elections', tab: 'elections', isExtension: true },
      { icon: BookOpen, label: 'Handbook', tab: 'handbook', isExtension: true },
    ],
    features: {
      ...DEFAULT_FEATURES,
      hasElections: true,
      hasHandbook: true,
    },
  },

  // MUS 240 - Survey of African American Music
  '23c4ee3c-7bbb-4534-8c0a-eecd88298d37': {
    courseId: '23c4ee3c-7bbb-4534-8c0a-eecd88298d37',
    courseCode: 'MUS 240',
    primaryNav: DEFAULT_PRIMARY_NAV,
    courseCore: DEFAULT_COURSE_CORE,
    features: {
      ...DEFAULT_FEATURES,
      hasJournals: true,
      hasPolls: true,
      hasPeerReview: true,
      hasGroups: true,
      hasListeningHub: true,
    },
  },

  // MUS 210 - Choral Conducting and Literature
  'a0000000-0000-0000-0000-000000000210': {
    courseId: 'a0000000-0000-0000-0000-000000000210',
    courseCode: 'MUS 210',
    primaryNav: DEFAULT_PRIMARY_NAV,
    courseCore: DEFAULT_COURSE_CORE,
    features: {
      ...DEFAULT_FEATURES,
      hasJournals: true,
    },
  },

  // MUS 001 - Private Applied Lessons
  'a0000000-0000-0000-0000-000000000001': {
    courseId: 'a0000000-0000-0000-0000-000000000001',
    courseCode: 'MUS 001',
    primaryNav: DEFAULT_PRIMARY_NAV.filter(item => 
      ['home', 'syllabus', 'assignments', 'grades'].includes(item.tab)
    ),
    courseCore: DEFAULT_COURSE_CORE.filter(item =>
      ['video-library', 'playlist', 'resources'].includes(item.tab)
    ),
    features: {
      ...DEFAULT_FEATURES,
      hasJournals: false,
      hasPolls: false,
      hasTests: false,
      hasDiscussions: false,
    },
  },

  // GLEE 101 - Leadership Development
  'a0000000-0000-0000-0000-0000000e0101': {
    courseId: 'a0000000-0000-0000-0000-0000000e0101',
    courseCode: 'GLEE 101',
    primaryNav: DEFAULT_PRIMARY_NAV,
    courseCore: DEFAULT_COURSE_CORE,
    features: {
      ...DEFAULT_FEATURES,
      hasHandbook: true,
    },
  },

  // GLEE 000 - Sight Singing Institute
  'a0000000-0000-0000-0000-000000000000': {
    courseId: 'a0000000-0000-0000-0000-000000000000',
    courseCode: 'GLEE 000',
    primaryNav: DEFAULT_PRIMARY_NAV.filter(item => 
      ['home', 'syllabus', 'modules', 'assignments', 'tests', 'grades'].includes(item.tab)
    ),
    courseCore: DEFAULT_COURSE_CORE.filter(item =>
      ['video-library', 'playlist', 'resources'].includes(item.tab)
    ),
    features: {
      ...DEFAULT_FEATURES,
      hasJournals: false,
      hasPolls: false,
      hasDiscussions: false,
    },
  },

  // MUS 101 - Music Fundamentals Theory
  'a0000000-0000-0000-0000-000000000101': {
    courseId: 'a0000000-0000-0000-0000-000000000101',
    courseCode: 'MUS 101',
    primaryNav: DEFAULT_PRIMARY_NAV,
    courseCore: DEFAULT_COURSE_CORE,
    features: {
      ...DEFAULT_FEATURES,
      hasTests: true,
    },
  },

  // LH 100 - Bowman Scholars
  'a0000000-0000-0000-0000-000000000100': {
    courseId: 'a0000000-0000-0000-0000-000000000100',
    courseCode: 'LH 100',
    primaryNav: DEFAULT_PRIMARY_NAV.filter(item => 
      ['home', 'syllabus', 'modules', 'assignments', 'journals', 'grades'].includes(item.tab)
    ),
    courseCore: DEFAULT_COURSE_CORE,
    extensions: [
      { icon: Calendar, label: 'Planner', tab: 'planner', isExtension: true },
      { icon: Images, label: 'Photo Gallery', tab: 'photo-gallery', isExtension: true },
      { icon: Archive, label: 'Archives', tab: 'journal-archives', isExtension: true },
    ],
    features: {
      ...DEFAULT_FEATURES,
      hasJournals: true,
      hasPolls: false,
      hasTests: false,
      hasDiscussions: false,
      hasPlanner: true,
      hasPhotoGallery: true,
    },
  },
};

/**
 * Get the template configuration for a course by ID or code
 */
export function getCourseTemplateConfig(courseIdOrCode: string): CourseTemplateConfig {
  // Try direct lookup by ID
  if (COURSE_TEMPLATE_CONFIGS[courseIdOrCode]) {
    return COURSE_TEMPLATE_CONFIGS[courseIdOrCode];
  }
  
  // Try lookup by course code
  const config = Object.values(COURSE_TEMPLATE_CONFIGS).find(
    c => c.courseCode === courseIdOrCode || 
         c.courseCode.toLowerCase().replace(' ', '-') === courseIdOrCode.toLowerCase()
  );
  
  // Return config or default template
  return config || {
    courseId: courseIdOrCode,
    courseCode: courseIdOrCode,
    primaryNav: DEFAULT_PRIMARY_NAV,
    courseCore: DEFAULT_COURSE_CORE,
    features: DEFAULT_FEATURES,
  };
}

/**
 * Get all navigation items for a course (primary + core + extensions)
 */
export function getAllNavItems(config: CourseTemplateConfig): {
  primary: CourseNavItem[];
  core: CourseNavItem[];
  extensions: CourseNavItem[];
} {
  return {
    primary: config.primaryNav,
    core: config.courseCore,
    extensions: config.extensions || [],
  };
}
